import { useMemo, useSyncExternalStore } from 'react';
import { useAuthState as useRemoteAuth } from 'react-firebase-hooks/auth';
import { useCollectionData as useRemoteCollection, useDocumentData as useRemoteDocument } from 'react-firebase-hooks/firestore';
import { remoteEnabled } from '../firebase.js';
import { getRevision, subscribe, safeDatabase, getStorageError } from './localStore.js';
import { localData } from './firestore.js';
const user = { uid: 'local-user', displayName: 'Biblioteca local', email: '' };
function useLocalData(ref) {
  const revision = useSyncExternalStore(subscribe, getRevision);
  const key = JSON.stringify(ref);
  return useMemo(() => [localData(ref), false, undefined], [key, revision]);
}
// The backend is fixed at build time; hook order never changes at runtime.
export const useAuthState = remoteEnabled ? useRemoteAuth : () => [user, false, undefined];
export const useCollectionData = remoteEnabled ? useRemoteCollection : useLocalData;
export const useDocumentData = remoteEnabled ? useRemoteDocument : useLocalData;
export function useLocalDatabase() {
  const revision = useSyncExternalStore(subscribe, getRevision);
  return useMemo(() => safeDatabase(), [revision]);
}
export function useStorageError() {
  useSyncExternalStore(subscribe, getRevision);
  return getStorageError();
}
