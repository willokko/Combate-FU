import { decodeDatabase, encodeDatabase } from './imageStorage.js';

// One atomic write contains encounters AND linked sheets. Never clear existing keys.
export const STORE_VERSION = 1;
export const LOCAL_STORE_KEY = `fultimator.local.v1:${import.meta.env?.BASE_URL || '/'}`;
export let STORE_KEY = LOCAL_STORE_KEY;
let accountScope = null;
export const getAccountScope = () => accountScope;
export function setAccountScope(uid) {
  accountScope = uid || null;
  STORE_KEY = uid ? `${LOCAL_STORE_KEY}:account:${encodeURIComponent(uid)}` : LOCAL_STORE_KEY;
  lastError = ''; emit();
}
export const LOCAL_UID = 'local-user';
const empty = () => ({ version: STORE_VERSION, revision: 0, collections: {}, encounters: {} });
const listeners = new Set();
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const newId = () => globalThis.crypto.randomUUID();
let lastError = '';
let revision = 0;
export const getStorageError = () => lastError;
export const getRevision = () => revision;
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function emit() { revision++; listeners.forEach(listener => listener()); }
export function reportStorageError(error) {
  lastError = error?.message || String(error);
  emit();
}
export function readDatabase(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORE_KEY);
    if (!raw) return empty();
    const data = decodeDatabase(raw);
    validateDatabaseShape(data);
    return data;
  } catch (error) {
    throw new Error(`Não foi possível ler os dados locais. Os dados anteriores foram preservados. ${error.message}`);
  }
}
export function transaction(mutator, storage = globalThis.localStorage) {
  try {
    const draft = readDatabase(storage);
    const result = mutator(draft);
    draft.revision++;
    if (accountScope) draft._cloud = { generation: draft._cloud?.generation || null, dirty: true };
    storage.setItem(STORE_KEY, encodeDatabase(draft));
    lastError = '';
    emit();
    return result;
  } catch (error) {
    const wrapped = new Error(`Não foi possível salvar. Os dados anteriores foram preservados. Verifique o espaço e a permissão de armazenamento. ${error.message}`);
    reportStorageError(wrapped);
    throw wrapped;
  }
}
export function validateDatabaseShape(data) {
  if (!data || data.version !== STORE_VERSION || !data.collections || typeof data.collections !== 'object' || Array.isArray(data.collections) || !data.encounters || typeof data.encounters !== 'object' || Array.isArray(data.encounters) || !Number.isSafeInteger(data.revision)) {
    throw new Error('A versão dos dados locais não é reconhecida. Exporte um backup antes de continuar.');
  }
}
// Atomic metadata updates do not count as user edits or trigger upload loops.
export function acceptCloudDatabase(database, generation, expectedRevision) {
  const current = readDatabase();
  if (current.revision !== expectedRevision) throw new Error('Houve uma alteração local durante o download. Tente novamente.');
  const next = { ...clone(database), revision: current.revision + 1, _cloud: { generation, dirty: false } };
  validateDatabaseShape(next);
  try { globalThis.localStorage.setItem(STORE_KEY, encodeDatabase(next)); lastError = ''; emit(); }
  catch (error) { reportStorageError(error); throw error; }
}
export function acknowledgeCloud(generation, uploadedRevision) {
  const next = readDatabase();
  next._cloud = { generation, dirty: next.revision !== uploadedRevision };
  try { globalThis.localStorage.setItem(STORE_KEY, encodeDatabase(next)); lastError = ''; emit(); }
  catch (error) { reportStorageError(error); throw error; }
}
export function readOfflineLibrary() {
  const raw = globalThis.localStorage.getItem(LOCAL_STORE_KEY);
  const database = raw ? decodeDatabase(raw) : empty();
  validateDatabaseShape(database);
  return database;
}
export function safeDatabase() {
  try { return readDatabase(); }
  catch (error) { lastError = error.message; return empty(); }
}
export function readPreference(key, fallback = null) {
  try { return globalThis.localStorage.getItem(key) ?? fallback; }
  catch { lastError = 'O navegador bloqueou o armazenamento local. Permita o armazenamento para salvar fichas e encontros.'; return fallback; }
}
export function writePreference(key, value) {
  try { globalThis.localStorage.setItem(key, value); }
  catch (error) { reportStorageError(error); }
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => { if (event.key === STORE_KEY) emit(); });
}
