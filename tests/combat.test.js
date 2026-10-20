import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clone, STORE_KEY, readDatabase, transaction } from '../src/data/localStore.js';
import { collectionFor, exportSheet, isCrisis, parseSheets, resourcesFor } from '../src/data/sheets.js';
import { changeEncounter, createEncounter, exportBackup, exportEncounter, makeParticipant, markTurn, nextRound, operate, parseEncounter, refreshLinks, restoreBackup, undoEncounter } from '../src/data/encounters.js';
import { importCandidates } from '../src/data/library.js';
import { collection, doc, limit, localData, orderBy, query, setDoc, startAfter, where } from '../src/data/firestore.js';
const pc = JSON.parse(readFileSync(new URL('./fixtures/pc.json', import.meta.url))), npc = JSON.parse(readFileSync(new URL('./fixtures/npc.json', import.meta.url)));
class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) || null; }
  setItem(key, value) { this.data.set(key, value); }
}
beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });
function setup({ independent = false } = {}) {
  let id, participantId;
  transaction(db => {
    const [entry] = importCandidates(db, parseSheets(pc), []);
    const encounter = createEncounter('Teste'); id = encounter.id; db.encounters[id] = encounter;
    const p = makeParticipant(db, encounter, entry, { independent }); participantId = p.id; encounter.participants.push(p);
  });
  return { id, participantId };
}
const encounter = id => readDatabase().encounters[id];
test('JSON exportado pc e texto colado preservam a ficha completa sem conversão', () => {
  const file = parseSheets(JSON.stringify(pc)), pasted = parseSheets(JSON.stringify(pc));
  assert.deepEqual(file, pasted); assert.deepEqual(file[0].sheet, pc); assert.equal(file[0].kind, 'pc');
});
test('JSON bruto de NPC, export individual e coleção reconhecidos', () => {
  const raw = clone(npc); delete raw.dataType;
  assert.equal(parseSheets(raw)[0].kind, 'npc'); assert.equal(parseSheets([pc, raw]).length, 2);
});
test('erros de JSON, tipo, estruturas e valores não alteram dados', () => {
  setup(); const previous = localStorage.getItem(STORE_KEY);
  for (const input of ['{', 'null', '[]', '{"dataType":"weapon"}', { ...pc, stats: { ...pc.stats, hp: { current: -1, max: 20 } } }, { ...pc, attributes: { ...pc.attributes, might: 99 } }]) assert.throws(() => parseSheets(input));
  assert.equal(localStorage.getItem(STORE_KEY), previous);
});
test('personagem real vinculado recebe dano, cura, PM, PI e Fábula na biblioteca', () => {
  const { id, participantId } = setup();
  changeEncounter(id, 'Recursos', e => { operate(e, [participantId], 'hp', 'subtract', 12); operate(e, [participantId], 'mp', 'subtract', 10); operate(e, [participantId], 'ip', 'subtract', 2); operate(e, [participantId], 'fabula', 'add', 1); });
  const p = encounter(id).participants[0], sheet = readDatabase().collections['player-personal'][p.link.key];
  assert.equal(sheet.stats.hp.current, 33); assert.equal(sheet.stats.mp.current, 35); assert.equal(sheet.stats.ip.current, 4); assert.equal(sheet.info.fabulapoints, 4);
  const expected = clone(pc); expected.stats.hp.current = 33; expected.stats.mp.current = 35; expected.stats.ip.current = 4; expected.info.fabulapoints = 4;
  assert.deepEqual(sheet, expected);
  changeEncounter(id, 'Cura', e => operate(e, [participantId], 'hp', 'add', 100)); assert.equal(encounter(id).participants[0].resources.hp.current, 45);
});
test('cópia independente não altera a biblioteca', () => {
  const { id, participantId } = setup({ independent: true });
  const before = clone(readDatabase().collections);
  changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 15));
  assert.deepEqual(readDatabase().collections, before); assert.equal(encounter(id).participants[0].link, null);
});
test('três NPCs possuem IDs, PV e efeitos independentes em encontro misto', () => {
  const { id } = setup();
  changeEncounter(id, 'NPCs', (e, db) => { for (let i = 0; i < 3; i++) e.participants.push(makeParticipant(db, e, parseSheets(npc)[0])); });
  const [pcInstance, first, second, third] = encounter(id).participants;
  assert.equal(new Set([first.id, second.id, third.id]).size, 3);
  assert.equal(first.kind, 'npc'); assert.equal(pcInstance.kind, 'pc');
  changeEncounter(id, 'Dano', e => operate(e, [second.id], 'hp', 'subtract', 13));
  const result = encounter(id).participants;
  assert.equal(result[1].resources.hp.current, 50); assert.equal(result[2].resources.hp.current, 37); assert.equal(result[3].resources.hp.current, 50);
});
test('operação em vários alvos é atômica, inclusive erro de recurso incompatível', () => {
  const { id, participantId } = setup();
  changeEncounter(id, 'NPC', (e, db) => e.participants.push(makeParticipant(db, e, parseSheets(npc)[0])));
  const ids = encounter(id).participants.map(p => p.id);
  changeEncounter(id, 'Dano coletivo', e => operate(e, ids, 'hp', 'subtract', 5));
  assert.deepEqual(encounter(id).participants.map(p => p.resources.hp.current), [40, 45]);
  const before = localStorage.getItem(STORE_KEY);
  assert.throws(() => changeEncounter(id, 'PI', e => operate(e, ids, 'ip', 'subtract', 1)), /não possui/);
  assert.equal(localStorage.getItem(STORE_KEY), before);
});
test('limites, valores inválidos e custos completos de PM', () => {
  const { id, participantId } = setup();
  for (const [op, value] of [['set', 46], ['subtract', -1], ['add', ''], ['add', 1.5], ['add', Infinity]]) assert.throws(() => changeEncounter(id, 'Inválido', e => operate(e, [participantId], 'hp', op, value)));
  assert.throws(() => changeEncounter(id, 'PM', e => operate(e, [participantId], 'mp', 'subtract', 46)), /insuficientes/);
  assert.equal(encounter(id).participants[0].resources.mp.current, 45);
});
test('condições e notas do encontro não se tornam permanentes', () => {
  const { id } = setup(); const before = clone(readDatabase().collections);
  changeEncounter(id, 'Efeito', e => { e.participants[0].conditions.push('slow'); e.participants[0].notes = 'Temporário'; e.participants[0].effects = 'Guarda até próximo turno'; });
  assert.deepEqual(readDatabase().collections, before); assert.equal(encounter(id).participants[0].conditions[0], 'slow');
});
test('Crise usa metade arredondada para baixo e reconhece zero', () => {
  const p = { resources: { hp: { max: 65, current: 33 } } }; assert.equal(isCrisis(p), false); p.resources.hp.current = 32; assert.equal(isCrisis(p), true); p.resources.hp.current = 0; assert.equal(isCrisis(p), true);
});
test('rodadas alternam lados, retornam ao vencedor da iniciativa e mantêm recursos', () => {
  const { id, participantId } = setup();
  changeEncounter(id, 'Elite', (e, db) => e.participants.push(makeParticipant(db, e, parseSheets({ ...npc, rank: 'elite' })[0])));
  changeEncounter(id, 'Turno', e => markTurn(e, participantId)); assert.equal(encounter(id).activeSide, 'foes');
  const enemy = encounter(id).participants[1]; assert.equal(enemy.turns, 2);
  changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 10));
  changeEncounter(id, 'Rodada', nextRound); assert.equal(encounter(id).round, 2); assert.equal(encounter(id).activeSide, 'heroes'); assert.equal(encounter(id).participants[0].acted, 0); assert.equal(encounter(id).participants[0].resources.hp.current, 35);
});
test('vínculos concorrentes são recusados entre encontros e cópias explícitas aceitas', () => {
  const { id } = setup();
  transaction(db => {
    const p = db.encounters[id].participants[0], entry = { key: p.link.key, kind: 'pc', sheet: pc }, e = createEncounter();
    assert.throws(() => makeParticipant(db, e, entry), /já está vinculado/);
    assert.equal(makeParticipant(db, e, entry, { independent: true }).link, null);
  });
});
test('desfazer restaura recursos sincronizados e preserva classes e campos desconhecidos', () => {
  const { id, participantId } = setup();
  changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 20)); undoEncounter(id);
  const p = encounter(id).participants[0]; assert.equal(p.resources.hp.current, 45); assert.deepEqual(readDatabase().collections['player-personal'][p.link.key], pc);
});
test('desfazer recusa conflito com recurso alterado posteriormente na biblioteca', () => {
  const { id, participantId } = setup(); changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 20));
  transaction(db => { const p = db.encounters[id].participants[0]; db.collections['player-personal'][p.link.key].stats.hp.current = 40; });
  assert.throws(() => undoEncounter(id), /mudou depois/); assert.equal(encounter(id).participants[0].resources.hp.current, 25);
});
test('edição de classe posterior não é perdida ao desfazer dano', () => {
  const { id, participantId } = setup(); changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 20));
  transaction(db => { const p = db.encounters[id].participants[0]; db.collections['player-personal'][p.link.key].classes[0].lvl = 6; });
  undoEncounter(id); const p = encounter(id).participants[0]; assert.equal(readDatabase().collections['player-personal'][p.link.key].classes[0].lvl, 6); assert.equal(exportSheet(p).classes[0].lvl, 6);
});
test('recarregar recupera todos os recursos, rodada, condições, notas e histórico', () => {
  const { id, participantId } = setup(); changeEncounter(id, 'Mudanças', e => { operate(e, [participantId], 'hp', 'subtract', 9); e.round = 4; e.participants[0].conditions = ['weak']; e.participants[0].notes = 'Alvo principal'; });
  const recovered = JSON.parse(localStorage.getItem(STORE_KEY)).encounters[id]; assert.deepEqual(recovered, encounter(id)); assert.equal(recovered.history.length, 1);
});
test('remover e encerrar preserva os recursos resultantes da biblioteca', () => {
  const { id, participantId } = setup(); changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 9)); const key = encounter(id).participants[0].link.key;
  changeEncounter(id, 'Remover', e => { e.participants = []; e.ended = true; }); assert.equal(readDatabase().collections['player-personal'][key].stats.hp.current, 36);
});
test('exportação atualizada mantém formato pc e todos os campos originais', () => {
  const { id, participantId } = setup(); changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 9)); const exported = exportSheet(encounter(id).participants[0]);
  assert.equal(parseSheets(JSON.stringify(exported))[0].sheet.stats.hp.current, 36); assert.deepEqual(exported.classes, pc.classes); assert.deepEqual(exported.weapons, pc.weapons); assert.deepEqual(exported.customExtension, pc.customExtension); assert.equal(exported.id, pc.id); assert.equal(exported.uid, pc.uid);
});
test('encontro exportado contém fichas completas e reimporta independente sem alterar biblioteca', () => {
  const { id } = setup(); const exported = exportEncounter(encounter(id)); exported.participants[0].resources.hp.current = '45'; const restored = parseEncounter(JSON.stringify(exported));
  assert.deepEqual(restored.participants[0].sheet, pc); assert.equal(restored.participants[0].resources.hp.current, 45); assert.equal(restored.participants[0].link, null); assert.notEqual(restored.id, id); assert.deepEqual(restored.history, []);
});
test('encontro inválido e versão futura são rejeitados antes de salvar', () => {
  const { id } = setup(); const data = exportEncounter(encounter(id)); assert.throws(() => parseEncounter({ ...data, version: 99 })); data.participants[0].resources.hp.current = -1; assert.throws(() => parseEncounter(data));
});
test('importação distingue usar existente, atualizar e criar cópia', () => {
  setup(); transaction(db => { const updated = { ...pc, customExtension: 'novo campo' }; const existing = importCandidates(db, parseSheets(updated), [])[0]; assert.deepEqual(existing.sheet, pc); importCandidates(db, parseSheets(updated), [{ action: 'update' }]); assert.equal(Object.values(db.collections['player-personal'])[0].customExtension, 'novo campo'); importCandidates(db, parseSheets(updated), [{ action: 'copy' }]); assert.equal(Object.values(db.collections['player-personal']).length, 2); });
});
test('backup restaura sem apagar dados anteriores e valida antes da transação', () => {
  const { id } = setup(); const backup = JSON.stringify(exportBackup(readDatabase())); const previous = localStorage.getItem(STORE_KEY);
  assert.throws(() => restoreBackup('{')); assert.equal(localStorage.getItem(STORE_KEY), previous);
  assert.throws(() => restoreBackup(JSON.stringify({ dataType: 'fultimator-local-backup', version: 1, database: { version: 1, collections: [], encounters: {} } }))); assert.equal(localStorage.getItem(STORE_KEY), previous);
  restoreBackup(backup); assert.equal(Object.values(readDatabase().collections['player-personal']).length, 1); assert.equal(Object.keys(readDatabase().encounters).length, 2); assert.ok(readDatabase().encounters[id]);
});
test('falha de armazenamento não grava estado parcial ou apaga biblioteca', () => {
  const { id, participantId } = setup(); const previous = localStorage.getItem(STORE_KEY); const set = localStorage.setItem; localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 10)), /dados anteriores foram preservados/); localStorage.setItem = set; assert.equal(localStorage.getItem(STORE_KEY), previous);
});
test('armazenamento corrompido nunca é sobrescrito automaticamente', () => {
  localStorage.setItem(STORE_KEY, '{corrompido'); assert.throws(() => transaction(db => { db.encounters = {}; })); assert.equal(localStorage.getItem(STORE_KEY), '{corrompido');
});
test('mudanças do editor original atualizam os recursos da instância vinculada', () => {
  const { id } = setup(); transaction(db => { const p = db.encounters[id].participants[0]; db.collections['player-personal'][p.link.key].stats.hp.current = 29; refreshLinks(db, p.link.collection, p.link.key); }); assert.equal(encounter(id).participants[0].resources.hp.current, 29);
});
test('encontro encerrado não pode alterar recursos até ser reaberto explicitamente', () => {
  const { id, participantId } = setup(); changeEncounter(id, 'Encerrar', e => { e.ended = true; });
  assert.throws(() => changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 10)), /encerrado/);
  changeEncounter(id, 'Reabrir', e => { e.ended = false; }, { allowEnded: true }); changeEncounter(id, 'Dano', e => operate(e, [participantId], 'hp', 'subtract', 10)); assert.equal(encounter(id).participants[0].resources.hp.current, 35);
});
test('o editor original mantém ID/UID de origem e sincroniza apenas a instância vinculada', async () => {
  const { id } = setup(); const p = encounter(id).participants[0]; const ref = doc(null, 'player-personal', p.link.key); const view = localData(ref);
  assert.equal(view.uid, 'local-user'); view.stats.hp.current = 28; view.classes[0].lvl = 6;
  await setDoc(ref, view);
  const stored = readDatabase().collections['player-personal'][p.link.key]; assert.equal(stored.uid, pc.uid); assert.equal(stored.id, pc.id); assert.equal(stored.classes[0].lvl, 6); assert.equal(encounter(id).participants[0].resources.hp.current, 28);
});
test('busca, filtros de nível e paginação do compêndio original funcionam localmente', () => {
  transaction(db => { db.collections['npc-personal'] = { a: { ...npc, lvl: 5, published: true, searchString: ['lobo'], publishedAt: 1 }, b: { ...npc, lvl: 10, published: true, searchString: ['lobo'], publishedAt: 2 }, c: { ...npc, lvl: 20, published: true, searchString: ['lobo'], publishedAt: 3 } }; });
  const ref = collection(null, 'npc-personal');
  const constraints = [where('published', '==', true), where('lvl', '>=', 10), where('lvl', '<=', 20), where('searchString', 'array-contains-any', ['lobo']), orderBy('publishedAt', 'desc')];
  assert.deepEqual(localData(query(ref, ...constraints)).map(npc => npc.id), ['c', 'b']); assert.deepEqual(localData(query(ref, ...constraints, startAfter(3), limit(1))).map(npc => npc.id), ['b']);
});
test('múltiplas fichas semelhantes exigem escolha explícita do registro para atualizar', () => {
  setup(); transaction(db => { importCandidates(db, parseSheets(pc), [{ action: 'copy' }]); });
  assert.throws(() => transaction(db => importCandidates(db, parseSheets(pc), [{ action: 'update' }])), /várias fichas semelhantes/);
  const keys = Object.keys(readDatabase().collections['player-personal']); transaction(db => importCandidates(db, parseSheets({ ...pc, info: { ...pc.info, exp: 10 } }), [{ action: 'update', existingKey: keys[1] }])); assert.equal(readDatabase().collections['player-personal'][keys[0]].info.exp, 0); assert.equal(readDatabase().collections['player-personal'][keys[1]].info.exp, 10);
});
