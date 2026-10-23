import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { decodeFirestore } from '../scripts/capture-public-compendium.mjs';
import { compendiumShareUrl, createCompendiumClient, searchCompendium } from '../src/data/compendium.js';
import { importCandidates } from '../src/data/library.js';
import { createEncounter, makeParticipant, operate } from '../src/data/encounters.js';
import { parseSheets, validateSheet } from '../src/data/sheets.js';
import { clone } from '../src/data/localStore.js';

const directory = new URL('../public/compendium/', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('index.json', directory), 'utf8'));
const packs = new Map([...new Set(catalog.entries.map(entry => entry.pack))].map(filename => [filename, JSON.parse(readFileSync(new URL(filename, directory), 'utf8'))]));
const source = entry => packs.get(entry.pack)[entry.sourceId];
const portuguese = catalog.entries.find(entry => entry.language === 'pt-BR');
beforeEach(() => { globalThis.localStorage = { getItem: () => null, setItem() {} }; });

test('catálogo contém somente fichas públicas em português e inglês, todas válidas e sem IDs repetidos', () => {
  assert.equal(new Set(catalog.entries.map(entry => entry.sourceId)).size, catalog.entries.length);
  assert.ok(catalog.languages['pt-BR'] > 300); assert.ok(catalog.languages.en > 3000);
  assert.equal(catalog.entries.length, catalog.languages.en + catalog.languages['pt-BR']);
  assert.equal(catalog.capturedCount, catalog.entries.length + catalog.excluded.length);
  for (const entry of catalog.entries) {
    const sheet = source(entry), candidate = validateSheet(sheet);
    assert.ok(['pt-BR', 'en'].includes(sheet.language)); assert.equal(sheet.published, true);
    assert.equal(candidate.kind, 'npc'); assert.equal(sheet.name, entry.name);
    assert.equal(sheet.createdBy || '', entry.createdBy);
    assert.deepEqual(sheet.publishedAt || null, entry.publishedAt);
    assert.equal(candidate.resources.hp.max, entry.hp); assert.equal(candidate.resources.mp.max, entry.mp);
  }
  assert.deepEqual(new Set(readdirSync(directory).filter(name => name.startsWith('pack-'))), new Set(packs.keys()));
});

test('ordenação original usa publicação decrescente e nível crescente quando filtrado', () => {
  const entries = [
    { sourceId: 'old', name: 'A', lvl: 20, publishedAt: { seconds: 10, nanoseconds: 0 } },
    { sourceId: 'new', name: 'B', lvl: 10, publishedAt: { seconds: 30, nanoseconds: 1 } },
    { sourceId: 'same-second', name: 'C', lvl: 5, publishedAt: { seconds: 30, nanoseconds: 2 } },
  ];
  assert.deepEqual(searchCompendium(entries, { order: 'published' }).map(e => e.sourceId), ['same-second', 'new', 'old']);
  assert.deepEqual(searchCompendium(entries, { order: 'level', minLevel: 10 }).map(e => e.sourceId), ['new', 'old']);
  assert.equal(entries[0].sourceId, 'old');
});

test('link compartilhado aponta para o catálogo público sob a base Pages, sem IDs privados', () => {
  const url = new URL(compendiumShareUrl('https://willokko.github.io/Combate-FU/#/npc-compedium?source=local', 'public-id'));
  assert.equal(url.pathname, '/Combate-FU/');
  assert.equal(url.hash, '#/npc-compedium?npc=public-id');
  assert.ok(!url.href.includes('npc-gallery'));
  assert.ok(!url.href.includes('source=local'));
});

test('decodificação mantém campos desconhecidos, arrays e precisão de timestamps do Firestore', () => {
  assert.deepEqual(decodeFirestore({ mapValue: { fields: {
    nested: { arrayValue: { values: [{ nullValue: null }, { integerValue: '-20' }, { booleanValue: true }] } },
    publishedAt: { timestampValue: '2025-10-12T03:04:05.123456789Z' },
    empty: { arrayValue: {} }, extra: { mapValue: {} },
  } } }), { nested: [null, -20, true], publishedAt: { seconds: 1760238245, nanoseconds: 123456789 }, empty: [], extra: {} });
  assert.throws(() => decodeFirestore({ integerValue: '9007199254740992' }));
});

test('busca combina nome sem acentos, autor, idioma e limites de nível', () => {
  const sample = [
    { sourceId: 'a', name: 'Gárgula de Pedra', createdBy: 'João', language: 'pt-BR', lvl: 10, species: 'Construct', rank: 'soldier' },
    { sourceId: 'b', name: 'Stone Gargoyle', createdBy: 'John', language: 'en', lvl: 20, species: 'Construct', rank: 'elite' },
  ];
  assert.equal(searchCompendium(sample, { search: 'gargula joao', language: 'pt-BR', minLevel: 5, maxLevel: 10 })[0].sourceId, 'a');
  assert.equal(searchCompendium(sample, { language: 'en', rank: 'elite', species: 'Construct' })[0].sourceId, 'b');
  assert.equal(searchCompendium(sample, { minLevel: 21 }).length, 0);
  assert.equal(searchCompendium(catalog.entries, { language: 'pt-BR' }).length, catalog.languages['pt-BR']);
});

test('cliente carrega arquivos sob a base do Pages, compartilha downloads e devolve cópias independentes', async () => {
  const urls = [];
  const client = createCompendiumClient({ base: '/Combate-FU/', fetcher: async url => {
    urls.push(url);
    return { ok: true, json: async () => url.endsWith('index.json') ? catalog : packs.get(portuguese.pack) };
  } });
  assert.equal((await client.index()).entries.length, catalog.entries.length);
  const [a, b] = await Promise.all([client.sheet(portuguese), client.sheet(portuguese)]);
  assert.deepEqual(a.sheet, source(portuguese)); a.sheet.name = 'Cópia alterada';
  assert.equal(b.sheet.name, portuguese.name); assert.equal(source(portuguese).name, portuguese.name);
  assert.deepEqual(urls, ['/Combate-FU/compendium/index.json', `/Combate-FU/compendium/${portuguese.pack}`]);
  await assert.rejects(client.sheet({ ...portuguese, pack: '../private.json' }), /inválido/);
});

test('falha de download permite tentar novamente; índice incompatível é recusado', async () => {
  let calls = 0;
  const client = createCompendiumClient({ fetcher: async () => ({ ok: ++calls > 1, json: async () => catalog }) });
  await assert.rejects(client.index(), /carregar/); assert.ok(await client.index());
  const invalid = createCompendiumClient({ fetcher: async () => ({ ok: true, json: async () => ({ version: 999, entries: [] }) }) });
  await assert.rejects(invalid.index(), /reconhecido/);
});

test('ficha real é copiada com todos os dados, exportada e reimportada sem modificar o catálogo', () => {
  const original = clone(source(portuguese));
  const db = { collections: {}, encounters: {} };
  const [entry] = importCandidates(db, parseSheets(original), []);
  assert.deepEqual(db.collections['npc-personal'][entry.key], original);
  const [again] = importCandidates(db, parseSheets(original), []);
  assert.equal(again.key, entry.key); assert.equal(Object.keys(db.collections['npc-personal']).length, 1);
  db.collections['npc-personal'][entry.key].notes = 'Minha anotação';
  importCandidates(db, parseSheets(original), []);
  assert.equal(db.collections['npc-personal'][entry.key].notes, 'Minha anotação');
  const exported = parseSheets(JSON.stringify(db.collections['npc-personal'][entry.key]))[0];
  assert.deepEqual(exported.sheet.attacks, original.attacks);
  assert.deepEqual(exported.sheet.special, original.special);
  assert.equal(exported.sheet.createdBy, original.createdBy);
  assert.deepEqual(source(portuguese), original);
});

test('três cópias de uma ficha real mantêm PV independentes e o catálogo intacto', () => {
  const candidate = validateSheet(source(portuguese)), db = { collections: {}, encounters: {} }, encounter = createEncounter();
  const original = clone(candidate.sheet);
  for (let i = 0; i < 3; i++) encounter.participants.push(makeParticipant(db, encounter, candidate));
  operate(encounter, [encounter.participants[1].id], 'hp', 'subtract', 7);
  assert.equal(encounter.participants[0].resources.hp.current, portuguese.hp);
  assert.equal(encounter.participants[1].resources.hp.current, Math.max(0, portuguese.hp - 7));
  assert.equal(encounter.participants[2].resources.hp.current, portuguese.hp);
  assert.deepEqual(source(portuguese), original);
});

test('ajustes negativos do editor original são aceitos quando os recursos finais são válidos', () => {
  const entry = catalog.entries.find(entry => Number(source(entry).extra?.hp) < 0);
  assert.ok(entry); assert.deepEqual(validateSheet(source(entry)).sheet, source(entry));
  const invalid = clone(source(entry)); invalid.extra.hp = -100000;
  assert.throws(() => validateSheet(invalid), /PV calculados/);
});
