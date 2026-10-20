// One atomic write contains encounters AND linked sheets. Never clear existing keys.
export const STORE_VERSION = 1;
export const STORE_KEY = `fultimator.local.v1:${import.meta.env?.BASE_URL || '/'}`;
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
    const data = JSON.parse(raw);
    if (data.version !== STORE_VERSION || !data.collections || typeof data.collections !== 'object' || Array.isArray(data.collections) || !data.encounters || typeof data.encounters !== 'object' || Array.isArray(data.encounters) || !Number.isSafeInteger(data.revision)) {
      throw new Error('A versão dos dados locais não é reconhecida. Exporte um backup antes de continuar.');
    }
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
    storage.setItem(STORE_KEY, JSON.stringify(draft));
    lastError = '';
    emit();
    return result;
  } catch (error) {
    const wrapped = new Error(`Não foi possível salvar. Os dados anteriores foram preservados. Verifique o espaço e a permissão de armazenamento. ${error.message}`);
    reportStorageError(wrapped);
    throw wrapped;
  }
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
