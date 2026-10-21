// Run only against the local Firestore emulator, never a live project.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, setDoc, terminate, updateDoc } from 'firebase/firestore';
import { createFirestoreCloud } from '../src/data/cloudFirestore.js';
import { packCloud, unpackCloud } from '../src/data/cloudProtocol.js';
import { readFileSync } from 'node:fs';

const address = process.env.FIRESTORE_EMULATOR_HOST;
const enabled = Boolean(address), clients = [];
function client(uid) {
  const app = initializeApp({ projectId: 'demo-combate-fu' }, uid || 'anonymous');
  const db = getFirestore(app);
  const [host, port] = address.split(':');
  connectFirestoreEmulator(db, host, Number(port), uid ? { mockUserToken: { sub: uid, user_id: uid } } : undefined);
  clients.push({ app, db }); return db;
}
let alice, bob, anonymous;
before(async () => {
  if (!enabled) return;
  const response = await fetch(`http://${address}/emulator/v1/projects/demo-combate-fu/databases/(default)/documents`, { method: 'DELETE' });
  assert.ok(response.ok);
  alice = client('alice'); bob = client('bob'); anonymous = client(null);
});
after(async () => { for (const { app, db } of clients) { await terminate(db); await deleteApp(app); } });
const validHead = () => ({ version: 1, generation: 'generation-1', chunkCount: 1, updatedAt: serverTimestamp(), previousGeneration: '', previousChunkCount: 0 });
const denied = promise => assert.rejects(promise, error => error.code === 'permission-denied');

test('dono pode salvar e ler; outra conta e usuário anônimo não acessam seus dados', { skip: !enabled }, async () => {
  await setDoc(doc(alice, 'users/alice/sync/head'), validHead());
  assert.equal((await getDoc(doc(alice, 'users/alice/sync/head'))).exists(), true);
  await denied(getDoc(doc(bob, 'users/alice/sync/head')));
  await denied(getDoc(doc(anonymous, 'users/alice/sync/head')));
  await denied(setDoc(doc(bob, 'users/alice/sync/head'), validHead()));
  await denied(setDoc(doc(anonymous, 'users/anonymous/sync/head'), validHead()));
});
test('fragmentos privados são imutáveis e não aceitam documentos inesperados', { skip: !enabled }, async () => {
  const path = 'users/alice/snapshots/generation-1/chunks/0';
  await setDoc(doc(alice, path), { data: '{"version":1}' });
  await denied(getDoc(doc(bob, path)));
  await denied(updateDoc(doc(alice, path), { data: 'substituir' }));
  await denied(setDoc(doc(alice, 'users/alice/snapshots/generation-2/chunks/0'), { other: true }));
});
test('versão, contagem e caminhos fora da biblioteca privada são recusados', { skip: !enabled }, async () => {
  await denied(setDoc(doc(alice, 'users/alice/sync/head'), { ...validHead(), chunkCount: 33 }));
  await denied(setDoc(doc(alice, 'users/alice/sync/head'), { ...validHead(), version: 99 }));
  await denied(setDoc(doc(alice, 'player-personal/public'), { name: 'não publicar' }));
});

test('adaptador real publica, recupera fichas e rejeita gravações concorrentes por transação', { skip: !enabled }, async () => {
  const remote = createFirestoreCloud('alice', alice);
  const pc = JSON.parse(readFileSync(new URL('./fixtures/pc.json', import.meta.url)));
  const database = { version: 1, revision: 1, collections: { 'player-personal': { lia: pc } }, encounters: {} };
  await remote.publish(packCloud(database), await remote.head());
  const head = await remote.head();
  assert.deepEqual(unpackCloud(await remote.load(head)), database);
  const results = await Promise.allSettled([
    remote.publish(packCloud(database), head),
    remote.publish(packCloud({ ...database, revision: 2 }), head),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'cloud/conflict');
  assert.equal((await remote.head()).generation, results.find(result => result.status === 'fulfilled').value);
});
