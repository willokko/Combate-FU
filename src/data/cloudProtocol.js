import { encodeDatabase, decodeDatabase } from './imageStorage.js';
import { validateDatabaseShape } from './localStore.js';
import { validateSheet } from './sheets.js';
import { parseEncounter } from './encounters.js';

export const CLOUD_CHUNK_SIZE = 180000;
export const CLOUD_MAX_CHUNKS = 32;
export class CloudConflict extends Error {
  constructor() { super('A nuvem foi alterada em outro dispositivo. Escolha qual versão manter.'); this.code = 'cloud/conflict'; }
}
export function validateCloudDatabase(database) {
  validateDatabaseShape(database);
  for (const [collection, kind] of [['player-personal', 'pc'], ['npc-personal', 'npc']]) {
    if (database.collections[collection] !== undefined && (!database.collections[collection] || typeof database.collections[collection] !== 'object' || Array.isArray(database.collections[collection]))) throw new Error('A biblioteca na nuvem está inválida.');
    for (const sheet of Object.values(database.collections[collection] || {})) {
      if (validateSheet(sheet).kind !== kind) throw new Error('A nuvem contém uma ficha na biblioteca incorreta.');
    }
  }
  for (const [id, encounter] of Object.entries(database.encounters)) {
    if (!encounter || encounter.id !== id || !Array.isArray(encounter.participants) || encounter.participants.some(p => !p || typeof p.id !== 'string' || !p.id) || new Set(encounter.participants.map(p => p.id)).size !== encounter.participants.length || typeof encounter.updatedAt !== 'string' || !Number.isFinite(Date.parse(encounter.updatedAt)) || (encounter.history !== undefined && !Array.isArray(encounter.history))) throw new Error('A nuvem contém um encontro inválido.');
    parseEncounter({ ...encounter, dataType: 'fultimator-encounter' });
  }
  return database;
}
export function packCloud(database) {
  const data = { ...database }; delete data._cloud;
  validateCloudDatabase(data);
  // Split by Unicode code points, keeping even worst-case UTF-8 chunks below
  // Firestore's 1 MiB document limit. No images are duplicated in history.
  const characters = Array.from(encodeDatabase(data)), chunks = [];
  if (new TextEncoder().encode(characters.join('')).length > 8 * 1024 * 1024) throw new Error('A biblioteca excede 8 MB para sincronização. Exporte backups e reduza encontros antigos.');
  for (let index = 0; index < characters.length; index += CLOUD_CHUNK_SIZE) chunks.push(characters.slice(index, index + CLOUD_CHUNK_SIZE).join(''));
  if (chunks.length > CLOUD_MAX_CHUNKS) throw new Error('A biblioteca excede o limite de sincronização. Exporte backups e reduza encontros antigos.');
  return chunks;
}
export function unpackCloud(chunks) {
  if (!Array.isArray(chunks) || !chunks.length || chunks.length > CLOUD_MAX_CHUNKS || chunks.some(chunk => typeof chunk !== 'string' || Array.from(chunk).length > CLOUD_CHUNK_SIZE)) throw new Error('O arquivo da nuvem está incompleto ou excede o limite.');
  const database = decodeDatabase(chunks.join(''));
  delete database._cloud;
  return validateCloudDatabase(database);
}

// Only one upload/pull at a time. Persisted dirty/base metadata survives reload
// and offline editing. A stale writer never silently replaces a newer version.
export function createCloudSync({ local, remote, status, delay = 2500 }) {
  let stopped = false, busy = false, ready = false, conflict = false, failed = false, queued = false, timer, head = null;
  const editing = () => Boolean(local.isEditing?.());
  const emit = (state, error = '', code = '') => { if (!stopped) status({ state, error, code }); };
  const fail = error => {
    if (stopped) return;
    conflict = error.code === 'cloud/conflict';
    failed = true;
    emit(conflict ? 'conflict' : 'error', error.message, error.code);
  };
  const schedule = () => {
    clearTimeout(timer);
    try {
      if (!stopped && ready && !busy && !conflict && !failed && !editing() && local.read()._cloud?.dirty) {
        emit('pending'); timer = setTimeout(() => { void sync(); }, delay);
      }
    } catch (error) { fail(error); }
  };
  const pull = async currentHead => {
    const before = local.read();
    const database = currentHead ? unpackCloud(await remote.load(currentHead)) : { version: 1, revision: 0, collections: {}, encounters: {} };
    if (stopped) return;
    if (local.read().revision !== before.revision) throw new CloudConflict();
    if (editing()) { emit('editing'); return; }
    local.accept(database, currentHead?.generation || null, before.revision);
    emit('synced');
  };
  const sync = async (resolution) => {
    clearTimeout(timer);
    if (busy) { queued = true; return; }
    if (stopped || (!ready && !resolution) || (conflict && !resolution)) return;
    if (editing()) { emit('editing'); return; }
    busy = true; failed = false; emit('syncing');
    try {
      head = await remote.head();
      if (stopped) return;
      if (editing()) { emit('editing'); return; }
      const database = local.read();
      if (resolution === 'remote') {
        // Retain both versions in the browser before an explicit replacement.
        local.preserveConflict(database);
        await pull(head); conflict = false;
      } else if (database._cloud?.dirty || resolution === 'local') {
        if (resolution !== 'local' && (head?.generation || null) !== (database._cloud?.generation || null)) throw new CloudConflict();
        if (resolution === 'local' && head) {
          const previous = unpackCloud(await remote.load(head));
          if (stopped) return;
          local.preserveConflict(previous);
        }
        if (stopped) return;
        const generation = await remote.publish(packCloud(database), head);
        if (stopped) return;
        local.acknowledge(generation, database.revision); conflict = false;
        emit(local.read()._cloud?.dirty ? 'pending' : 'synced');
      } else if ((head?.generation || null) !== (database._cloud?.generation || null)) await pull(head);
      else emit('synced');
      ready = true;
    } catch (error) { fail(error); }
    finally {
      busy = false;
      if (queued && !stopped && !failed && !conflict && !editing()) { queued = false; void sync(); }
      else { queued = false; schedule(); }
    }
  };
  const unwatch = remote.watch(currentHead => {
    if (stopped) return;
    head = currentHead; ready = true; failed = false;
    // The uploader receives its own head event before its transaction resolves.
    if (!busy) void sync(); else queued = true;
  }, fail);
  const unsubscribe = local.subscribe(schedule);
  return {
    sync: () => sync('retry'),
    resolve: choice => sync(choice),
    stop() { stopped = true; clearTimeout(timer); unwatch(); unsubscribe(); },
  };
}
