import { doc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { firestore } from '../firebase.js';
import { CLOUD_MAX_CHUNKS, CloudConflict } from './cloudProtocol.js';

export function createFirestoreCloud(uid, store = firestore) {
  const root = ['users', uid];
  const headRef = doc(store, ...root, 'sync', 'head');
  const chunkRef = (generation, index) => doc(store, ...root, 'snapshots', generation, 'chunks', String(index));
  const readHead = snapshot => {
    if (!snapshot.exists()) return null;
    const value = snapshot.data();
    if (value.version !== 1 || typeof value.generation !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value.generation) || !Number.isInteger(value.chunkCount) || value.chunkCount < 1 || value.chunkCount > CLOUD_MAX_CHUNKS) throw new Error('A versão dos dados na nuvem não é reconhecida.');
    if (value.previousGeneration && (!/^[a-zA-Z0-9-]{1,80}$/.test(value.previousGeneration) || !Number.isInteger(value.previousChunkCount) || value.previousChunkCount < 1 || value.previousChunkCount > CLOUD_MAX_CHUNKS)) throw new Error('O histórico da nuvem está inválido.');
    return value;
  };
  return {
    head: async () => readHead(await getDocFromServer(headRef)),
    watch(callback, error) {
      return onSnapshot(headRef, { includeMetadataChanges: true }, snapshot => {
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        try { callback(readHead(snapshot)); } catch (cause) { error(cause); }
      }, error);
    },
    async load(head) {
      const chunks = await Promise.all(Array.from({ length: head.chunkCount }, (_, index) => getDocFromServer(chunkRef(head.generation, index))));
      return chunks.map(chunk => {
        if (!chunk.exists() || typeof chunk.data().data !== 'string') throw new Error('O download da nuvem está incompleto. Tente sincronizar novamente.');
        return chunk.data().data;
      });
    },
    async publish(chunks, expected) {
      const generation = crypto.randomUUID();
      const batch = writeBatch(store);
      chunks.forEach((data, index) => batch.set(chunkRef(generation, index), { data }));
      await batch.commit();
      await runTransaction(store, async transaction => {
        const current = readHead(await transaction.get(headRef));
        if ((current?.generation || null) !== (expected?.generation || null)) throw new CloudConflict();
        transaction.set(headRef, {
          version: 1, generation, chunkCount: chunks.length, updatedAt: serverTimestamp(),
          previousGeneration: current?.generation || '', previousChunkCount: current?.chunkCount || 0,
        });
      });
      // Keep the previous version available for an in-flight reader. Older
      // snapshots are deleted only after the new head has committed.
      if (expected?.previousGeneration && Number.isInteger(expected.previousChunkCount) && expected.previousChunkCount <= CLOUD_MAX_CHUNKS) {
        const cleanup = writeBatch(store);
        for (let index = 0; index < expected.previousChunkCount; index++) cleanup.delete(chunkRef(expected.previousGeneration, index));
        await cleanup.commit().catch(() => {});
      }
      return generation;
    },
  };
}
