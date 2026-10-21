import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { acknowledgeCloud, acceptCloudDatabase, clone, getAccountScope, readDatabase, readOfflineLibrary, setAccountScope, STORE_KEY, transaction } from '../src/data/localStore.js';
import { CloudConflict, createCloudSync, packCloud, unpackCloud } from '../src/data/cloudProtocol.js';
import { hasUnsavedEdits, setEditorDirty } from '../src/data/cloudEditing.js';

const pc = JSON.parse(readFileSync(new URL('./fixtures/pc.json', import.meta.url)));
const database = () => ({ version: 1, revision: 0, collections: { 'player-personal': { lia: clone(pc) } }, encounters: {} });
const settle = async () => { for (let index = 0; index < 8; index++) await new Promise(resolve => setTimeout(resolve, 1)); };
class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
}
beforeEach(() => { globalThis.localStorage = new MemoryStorage(); setAccountScope(null); });

function device(initial = database()) {
  let data = clone(initial), editing = false;
  const listeners = new Set(), preserved = [];
  const emit = () => listeners.forEach(listener => listener());
  return {
    read: () => clone(data), preserved,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    edit(name) { data.collections['player-personal'].lia.name = name; data.revision++; data._cloud = { generation: data._cloud?.generation || null, dirty: true }; emit(); },
    accept(value, generation, revision) { assert.equal(data.revision, revision); data = { ...clone(value), revision: revision + 1, _cloud: { generation, dirty: false } }; emit(); },
    acknowledge(generation, revision) { data._cloud = { generation, dirty: data.revision !== revision }; emit(); },
    preserveConflict(value) { preserved.push(clone(value)); },
    isEditing: () => editing,
    setEditing(value) { editing = value; },
  };
}
function server() {
  let head = null, sequence = 0;
  const versions = new Map(), watchers = new Set();
  const api = {
    uploads: 0, fail: false, beforePublish: null, beforeLoad: null,
    async head() { return clone(head); },
    async load(value) { if (api.beforeLoad) await api.beforeLoad(); return clone(versions.get(value.generation)); },
    watch(callback) { watchers.add(callback); queueMicrotask(() => callback(clone(head))); return () => watchers.delete(callback); },
    async publish(chunks, expected) {
      if (api.fail) throw Object.assign(new Error('offline'), { code: 'unavailable' });
      if (api.beforePublish) await api.beforePublish();
      if ((head?.generation || null) !== (expected?.generation || null)) throw new CloudConflict();
      api.uploads++; const generation = `generation-${++sequence}`;
      versions.set(generation, clone(chunks)); head = { generation, chunkCount: chunks.length };
      watchers.forEach(callback => callback(clone(head)));
      return generation;
    },
    async seed(value) { return api.publish(packCloud(value), head); },
  };
  return api;
}
function connect(t, local, remote, delay = 60000) {
  const states = [];
  const engine = createCloudSync({ local, remote, status: state => states.push(state), delay });
  t.after(() => engine.stop());
  return { engine, states, last: () => states.at(-1)?.state };
}

test('contas Google têm caches separados; entrar e sair não migra nem apaga a biblioteca local', () => {
  transaction(db => { db.collections['player-personal'] = { lia: clone(pc) }; });
  const original = readDatabase();
  setAccountScope('alice');
  assert.deepEqual(readDatabase().collections, {});
  transaction(db => { db.collections.alice = { name: 'Somente Alice' }; });
  assert.equal(readDatabase()._cloud.dirty, true);
  setAccountScope('bob'); assert.deepEqual(readDatabase().collections, {});
  assert.deepEqual(readOfflineLibrary(), original);
  setAccountScope('alice'); assert.equal(readDatabase().collections.alice.name, 'Somente Alice');
  setAccountScope(null); assert.deepEqual(readDatabase(), original); assert.equal(getAccountScope(), null);
});

test('metadados persistem offline e confirmação de upload mantém edições feitas durante o envio', () => {
  setAccountScope('alice');
  transaction(db => { db.collections['player-personal'] = { lia: clone(pc) }; });
  const sent = readDatabase();
  transaction(db => { db.collections['player-personal'].lia.name = 'Nova edição'; });
  acknowledgeCloud('generation-1', sent.revision);
  assert.equal(readDatabase()._cloud.dirty, true);
  assert.equal(readDatabase()._cloud.generation, 'generation-1');
  acknowledgeCloud('generation-2', readDatabase().revision);
  assert.equal(readDatabase()._cloud.dirty, false);
  const before = localStorage.getItem(STORE_KEY);
  assert.throws(() => acceptCloudDatabase(database(), 'generation-3', 0), /alteração local/);
  assert.equal(localStorage.getItem(STORE_KEY), before);
});

test('protocolo mantém fichas, imagens, extensões e Unicode entre fragmentos, sem metadados locais', () => {
  const db = database();
  db.collections['player-personal'].lia.info.description = '✨😀ação '.repeat(30000);
  db.collections['player-personal'].lia.info.imgurl = 'data:image/png;base64,YWJj';
  db._cloud = { generation: 'old', dirty: true };
  db.extension = { original: true };
  const chunks = packCloud(db);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => new TextEncoder().encode(chunk).length < 1024 * 1024));
  const expected = clone(db); delete expected._cloud;
  assert.deepEqual(unpackCloud(chunks), expected);
  assert.throws(() => unpackCloud(chunks.slice(1)));
  assert.throws(() => unpackCloud(['{"version":99}']));
});

test('upload seguido de download em outro dispositivo preserva a ficha original', async t => {
  const remote = server(), first = device(), second = device({ version: 1, revision: 0, collections: {}, encounters: {} });
  const a = connect(t, first, remote); await settle();
  first.edit('Lia na nuvem'); await a.engine.sync(); await settle();
  const b = connect(t, second, remote); await settle();
  assert.equal(b.last(), 'synced');
  assert.equal(second.read().collections['player-personal'].lia.name, 'Lia na nuvem');
  assert.deepEqual(second.read().collections['player-personal'].lia.classes, pc.classes);
  assert.equal(remote.uploads, 1);
});

test('salvamento automático agrupa várias alterações e não entra em ciclo ao receber o próprio envio', async t => {
  const remote = server(), local = device();
  const client = connect(t, local, remote, 2); await settle();
  local.edit('um'); local.edit('dois'); local.edit('três'); await settle();
  assert.equal(remote.uploads, 1); assert.equal(client.last(), 'synced');
  assert.equal(unpackCloud(await remote.load(await remote.head())).collections['player-personal'].lia.name, 'três');
});

test('falha de rede preserva alterações e não repete uploads sem limite; reconexão reenvia', async t => {
  const remote = server(), local = device();
  const client = connect(t, local, remote, 1); await settle();
  remote.fail = true; local.edit('Sem internet'); await settle();
  assert.equal(client.last(), 'error'); assert.equal(local.read()._cloud.dirty, true);
  assert.equal(remote.uploads, 0);
  remote.fail = false; await client.engine.sync(); await settle();
  assert.equal(client.last(), 'synced'); assert.equal(local.read()._cloud.dirty, false);
});

test('edições concorrentes exigem escolha e guardam uma cópia antes de substituir', async t => {
  const remote = server(), local = device();
  const client = connect(t, local, remote); await settle();
  local.edit('Edição local');
  const other = database(); other.collections['player-personal'].lia.name = 'Outro dispositivo';
  await remote.seed(other); await settle();
  assert.equal(client.last(), 'conflict'); assert.equal(local.read().collections['player-personal'].lia.name, 'Edição local');
  await client.engine.resolve('remote'); await settle();
  assert.equal(local.preserved[0].collections['player-personal'].lia.name, 'Edição local');
  assert.equal(local.read().collections['player-personal'].lia.name, 'Outro dispositivo');
  assert.equal(client.last(), 'synced');
});

test('escolher versão local usa comparação de geração e preserva a versão remota', async t => {
  const remote = server(), local = device();
  const client = connect(t, local, remote); await settle(); local.edit('Versão escolhida');
  await remote.seed(database()); await settle(); assert.equal(client.last(), 'conflict');
  await client.engine.resolve('local'); await settle();
  assert.deepEqual(local.preserved[0].collections['player-personal'].lia, pc);
  assert.equal(unpackCloud(await remote.load(await remote.head())).collections['player-personal'].lia.name, 'Versão escolhida');
});

test('uma edição feita durante o upload permanece pendente para o próximo envio', async t => {
  const remote = server(), local = device(); const client = connect(t, local, remote); await settle();
  local.edit('Primeira');
  remote.beforePublish = async () => { remote.beforePublish = null; local.edit('Mais recente'); };
  await client.engine.sync(); await settle();
  await client.engine.sync(); await settle();
  assert.equal(unpackCloud(await remote.load(await remote.head())).collections['player-personal'].lia.name, 'Mais recente');
  assert.equal(local.read()._cloud.dirty, false);
});

test('edições de formulário bloqueiam downloads até salvar ou descartar, sem perder rascunho', async t => {
  const remote = server(), local = device(); const client = connect(t, local, remote); await settle();
  local.setEditing(true);
  const other = database(); other.collections['player-personal'].lia.name = 'Nova nuvem';
  await remote.seed(other); await settle();
  assert.equal(client.last(), 'editing'); assert.equal(local.read().collections['player-personal'].lia.name, pc.name);
  local.setEditing(false); await client.engine.sync(); await settle();
  assert.equal(local.read().collections['player-personal'].lia.name, 'Nova nuvem');
  const editor = {}; setEditorDirty(editor, true); assert.equal(hasUnsavedEdits(), true);
  setEditorDirty(editor, false); assert.equal(hasUnsavedEdits(), false);
});

test('download em andamento nunca sobrescreve uma alteração local feita enquanto espera', async t => {
  const remote = server(), local = device(); const client = connect(t, local, remote); await settle();
  remote.beforeLoad = async () => { remote.beforeLoad = null; local.edit('Edição durante download'); };
  await remote.seed(database()); await settle();
  assert.equal(client.last(), 'conflict');
  assert.equal(local.read().collections['player-personal'].lia.name, 'Edição durante download');
});

test('trocar de conta interrompe callbacks antigos e não grava resultado tardio no novo perfil', async t => {
  const remote = server(), local = device(); const client = connect(t, local, remote); await settle();
  let release; const wait = new Promise(resolve => { release = resolve; });
  remote.beforeLoad = () => wait;
  await remote.seed(database()); await settle();
  client.engine.stop(); release(); await settle();
  assert.equal(local.read()._cloud, undefined);
});

test('trocar de conta durante resolução não preserva nem envia dados na nova sessão', async t => {
  const remote = server(), local = device(); const client = connect(t, local, remote); await settle();
  local.edit('Versão local'); await remote.seed(database()); await settle();
  assert.equal(client.last(), 'conflict');
  let release; const wait = new Promise(resolve => { release = resolve; });
  remote.beforeLoad = () => wait;
  const resolution = client.engine.resolve('local'); await settle();
  client.engine.stop(); release(); await resolution;
  assert.equal(local.preserved.length, 0);
  assert.equal(remote.uploads, 1);
});
