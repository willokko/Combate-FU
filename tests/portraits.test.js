import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dataImageBytes, portraitDimensions, PORTRAIT_MAX_FILE_BYTES, validatePortraitFile } from '../src/data/portraits.js';
import { decodeDatabase, encodeDatabase } from '../src/data/imageStorage.js';
import { clone, readDatabase, STORE_KEY, transaction } from '../src/data/localStore.js';
import { exportSheet, parseSheets } from '../src/data/sheets.js';
import { importCandidates } from '../src/data/library.js';
import { changeEncounter, createEncounter, exportBackup, exportEncounter, makeParticipant, operate, parseEncounter, restoreBackup, undoEncounter } from '../src/data/encounters.js';

const pc = JSON.parse(readFileSync(new URL('./fixtures/pc.json', import.meta.url)));
const npc = JSON.parse(readFileSync(new URL('./fixtures/npc.json', import.meta.url)));
const portrait = 'data:image/jpeg;base64,' + readFileSync(new URL('../src/components/avatar.jpg', import.meta.url)).toString('base64');
class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
}
beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });

test('arquivos locais aceitam formatos de retrato e rejeitam tipo, tamanho ou arquivo vazio', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) assert.doesNotThrow(() => validatePortraitFile({ type, size: PORTRAIT_MAX_FILE_BYTES }));
  for (const file of [null, { type: 'text/plain', size: 12 }, { type: 'image/svg+xml', size: 32 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: PORTRAIT_MAX_FILE_BYTES + 1 }]) assert.throws(() => validatePortraitFile(file), /imagem|arquivo/i);
});

test('redução mantém proporção, não amplia imagens e recusa dimensões excessivas', () => {
  assert.deepEqual(portraitDimensions(2400, 1200), { width: 512, height: 256 });
  assert.deepEqual(portraitDimensions(600, 1800), { width: 171, height: 512 });
  assert.deepEqual(portraitDimensions(32, 24), { width: 32, height: 24 });
  for (const [width, height] of [[0, 12], [Infinity, 20], [-2, 3], [10000, 10000]]) assert.throws(() => portraitDimensions(width, height), /dimensões/);
  assert.equal(dataImageBytes(portrait), readFileSync(new URL('../src/components/avatar.jpg', import.meta.url)).length);
});

test('banco anterior sem envelope continua legível e é preservado sem migração destrutiva', () => {
  const legacy = { version: 1, revision: 5, collections: { 'player-personal': { pc } }, encounters: {}, extension: { imgurl: 'https://example.org/portrait.jpg', notes: '$fultimatorImage' } };
  localStorage.setItem(STORE_KEY, JSON.stringify(legacy));
  assert.deepEqual(readDatabase(), legacy);
  transaction(db => { db.collections['player-personal'].pc.info.imgurl = portrait; });
  const recovered = readDatabase();
  const expected = clone(legacy); expected.revision++; expected.collections['player-personal'].pc.info.imgurl = portrait;
  assert.deepEqual(recovered, expected);
});

test('retratos repetidos em fichas e histórico são armazenados uma única vez sem alterar os dados', () => {
  const database = { version: 1, revision: 0, collections: { pc: { info: { imgurl: portrait } }, npc: { imgurl: portrait } }, encounters: { history: Array.from({ length: 20 }, () => ({ before: { imgurl: portrait } })) }, unknown: { imgurl: 'https://example.com/image.png', extra: { $fultimatorImage: 100 } } };
  const encoded = encodeDatabase(database);
  assert.equal(JSON.parse(encoded).images.length, 1);
  assert.ok(encoded.length < JSON.stringify(database).length / 5);
  assert.deepEqual(decodeDatabase(encoded), database);
  assert.equal(database.collections.pc.info.imgurl, portrait);
});

test('armazenamento de imagem incompleto é rejeitado sem substituir o banco anterior', () => {
  for (const corrupt of [
    { dataType: 'fultimator-image-storage', version: 99, images: [portrait], database: {} },
    { dataType: 'fultimator-image-storage', version: 1, images: [], database: { version: 1, collections: { info: { imgurl: { $fultimatorImage: 0 } } }, encounters: {} } },
  ]) {
    const raw = JSON.stringify(corrupt); localStorage.setItem(STORE_KEY, raw);
    assert.throws(() => transaction(db => { db.name = 'não salvar'; }), /preservados/);
    assert.equal(localStorage.getItem(STORE_KEY), raw);
  }
});

function setupPortraits() {
  let encounterId, participantId, key;
  transaction(db => {
    const player = clone(pc); player.info.imgurl = portrait;
    const enemy = clone(npc); enemy.imgurl = portrait;
    const entries = importCandidates(db, parseSheets([player, enemy]), []);
    const encounter = createEncounter('Retratos locais'); encounterId = encounter.id;
    db.encounters[encounter.id] = encounter;
    for (const candidate of entries) {
      const participant = makeParticipant(db, encounter, candidate);
      encounter.participants.push(participant);
      if (candidate.kind === 'pc') { key = candidate.key; participantId = participant.id; }
    }
  });
  return { encounterId, participantId, key };
}

test('retratos de PJ e NPC acompanham JSON da ficha, encontro e backup completos', () => {
  const { encounterId } = setupPortraits();
  const encounter = readDatabase().encounters[encounterId];
  for (const participant of encounter.participants) {
    const sheet = parseSheets(JSON.stringify(exportSheet(participant)))[0].sheet;
    assert.equal(participant.kind === 'pc' ? sheet.info.imgurl : sheet.imgurl, portrait);
  }
  const imported = parseEncounter(JSON.stringify(exportEncounter(encounter)));
  assert.equal(imported.participants[0].sheet.info.imgurl, portrait);
  assert.equal(imported.participants[1].sheet.imgurl, portrait);
  const backup = JSON.stringify(exportBackup(readDatabase()));
  assert.ok(!backup.includes('$fultimatorImage'));
  globalThis.localStorage = new MemoryStorage();
  restoreBackup(backup);
  assert.ok(Object.values(readDatabase().collections['player-personal']).some(sheet => sheet.info.imgurl === portrait));
});

test('dano, sincronização, desfazer e recuperação mantêm retratos sem multiplicar o armazenamento', () => {
  const { encounterId, participantId, key } = setupPortraits();
  for (let index = 0; index < 20; index++) changeEncounter(encounterId, 'Dano', encounter => operate(encounter, [participantId], 'hp', 'subtract', 1));
  const current = readDatabase();
  assert.equal(current.encounters[encounterId].participants[0].sheet.info.imgurl, portrait);
  assert.equal(current.collections['player-personal'][key].info.imgurl, portrait);
  assert.equal(JSON.parse(localStorage.getItem(STORE_KEY)).images.length, 1);
  assert.ok(localStorage.getItem(STORE_KEY).length < JSON.stringify(current).length / 2);
  undoEncounter(encounterId);
  assert.equal(readDatabase().collections['player-personal'][key].info.imgurl, portrait);
  assert.equal(readDatabase().collections['player-personal'][key].stats.hp.current, pc.stats.hp.current - 19);
});

test('retirar a última imagem elimina a tabela e falha de espaço mantém os dados anteriores', () => {
  transaction(db => { db.collections.portrait = { imgurl: portrait }; });
  const previous = localStorage.getItem(STORE_KEY);
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => transaction(db => { db.collections.portrait.imgurl = ''; }), /preservados/);
  assert.equal(localStorage.getItem(STORE_KEY), previous);
  localStorage.setItem = MemoryStorage.prototype.setItem;
  transaction(db => { db.collections.portrait.imgurl = ''; });
  assert.equal(JSON.parse(localStorage.getItem(STORE_KEY)).images, undefined);
  assert.equal(readDatabase().collections.portrait.imgurl, '');
});
