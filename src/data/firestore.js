// Persistence port for the APIs used by the original editors.
import * as remote from 'firebase/firestore';
import { remoteEnabled } from '../firebase.js';
import { clone, newId, safeDatabase, transaction } from './localStore.js';
import { refreshLinks } from './encounters.js';
const local = (kind, parts) => ({ local: true, kind, path: parts.filter(p => typeof p === 'string').join('/'), constraints: [] });
export const collection = (...args) => remoteEnabled ? remote.collection(...args) : local('collection', args);
export const doc = (...args) => remoteEnabled ? remote.doc(...args) : local('document', args);
export const where = (...args) => remoteEnabled ? remote.where(...args) : ({ type: 'where', args });
export const orderBy = (...args) => remoteEnabled ? remote.orderBy(...args) : ({ type: 'orderBy', args });
export const limit = (...args) => remoteEnabled ? remote.limit(...args) : ({ type: 'limit', args });
export const startAfter = (...args) => remoteEnabled ? remote.startAfter(...args) : ({ type: 'startAfter', args });
export const query = (ref, ...constraints) => remoteEnabled ? remote.query(ref, ...constraints) : ({ ...ref, constraints });
const valueAt = (item, field) => field.split('.').reduce((v, k) => v?.[k], item);
const comparable = value => value && typeof value === 'object' && 'seconds' in value ? value.seconds * 1000 + (value.nanoseconds || 0) / 1000000 : value;
function compare(a, b) {
  a = comparable(a); b = comparable(b);
  return a === b ? 0 : a === undefined ? -1 : b === undefined ? 1 : a < b ? -1 : 1;
}
export function localData(ref) {
  if (!ref) return undefined;
  const db = safeDatabase();
  const [collection, id] = ref.path.split('/');
  const records = db.collections[collection] || {};
  if (id) return records[id] ? { ...clone(records[id]), id, uid: 'local-user' } : undefined;
  let values = Object.entries(records).map(([id, sheet]) => ({ ...clone(sheet), id, uid: 'local-user' }));
  for (const rule of ref.constraints || []) {
    const [field, op, value] = rule.args;
    if (rule.type === 'where') values = values.filter(item => {
      const actual = valueAt(item, field);
      if (op === '==') return actual === value;
      if (op === '!=') return actual !== value;
      if (op === '>=') return compare(actual, value) >= 0;
      if (op === '<=') return compare(actual, value) <= 0;
      if (op === '>') return compare(actual, value) > 0;
      if (op === '<') return compare(actual, value) < 0;
      if (op === 'array-contains') return actual?.includes(value);
      if (op === 'array-contains-any') return Array.isArray(actual) && value.some(v => actual.includes(v));
      if (op === 'in') return value.includes(actual);
      return false;
    });
  }
  const orders = (ref.constraints || []).filter(c => c.type === 'orderBy');
  values.sort((a, b) => {
    for (const { args: [field, direction] } of orders) {
      const result = compare(valueAt(a, field), valueAt(b, field));
      if (result) return direction === 'desc' ? -result : result;
    }
    return 0;
  });
  const cursor = ref.constraints?.find(c => c.type === 'startAfter')?.args;
  if (cursor?.length) values = values.filter(item => {
    for (let index = 0; index < cursor.length; index++) {
      const [field, direction] = orders[index]?.args || ['id', 'asc'];
      const result = compare(valueAt(item, field), cursor[index]) * (direction === 'desc' ? -1 : 1);
      if (result) return result > 0;
    }
    return false;
  });
  const count = ref.constraints?.find(c => c.type === 'limit')?.args[0];
  return count ? values.slice(0, count) : values;
}
export async function addDoc(ref, value) {
  if (remoteEnabled) return remote.addDoc(ref, value);
  const id = newId();
  transaction(db => { db.collections[ref.path] ||= {}; db.collections[ref.path][id] = clone(value); });
  return { id };
}
export async function setDoc(ref, value, options) {
  if (remoteEnabled) return remote.setDoc(ref, value, options);
  transaction(db => {
    const [collection, id] = ref.path.split('/');
    db.collections[collection] ||= {};
    const old = db.collections[collection][id];
    const next = clone(value);
    // UI ownership and local IDs do not replace imported source metadata.
    if (old) for (const key of ['id', 'uid']) {
      if (old[key] === undefined) delete next[key]; else next[key] = old[key];
    }
    db.collections[collection][id] = options?.merge ? { ...old, ...next } : next;
    refreshLinks(db, collection, id);
  });
}
export async function deleteDoc(ref) {
  if (remoteEnabled) return remote.deleteDoc(ref);
  transaction(db => {
    const [collection, id] = ref.path.split('/');
    if (db.collections[collection]) delete db.collections[collection][id];
    for (const encounter of Object.values(db.encounters)) for (const p of encounter.participants) if (p.link?.key === id && p.link.collection === collection) p.link = null;
  });
}
export async function getDoc(ref) {
  if (remoteEnabled) return remote.getDoc(ref);
  const value = localData(ref);
  return { id: ref.path.split('/').at(-1), exists: () => Boolean(value), data: () => value };
}
export async function getDocs(ref) {
  if (remoteEnabled) return remote.getDocs(ref);
  const docs = (localData(ref) || []).map(value => ({ id: value.id, data: () => value, exists: () => true }));
  return { docs, empty: !docs.length, forEach: callback => docs.forEach(callback) };
}
