import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codexExtraClasses, codexExtraTranslations } from '../src/libs/codexExtraClasses.js';
import { canPerformRitualism, createPlayerClass } from '../src/libs/playerClasses.js';
import { clone, readDatabase, transaction } from '../src/data/localStore.js';
import { exportSheet, parseSheets } from '../src/data/sheets.js';
import { importCandidates } from '../src/data/library.js';
import { changeEncounter, createEncounter, makeParticipant, operate, undoEncounter } from '../src/data/encounters.js';

const pc = JSON.parse(readFileSync(new URL('./fixtures/pc.json', import.meta.url)));
const byName = name => codexExtraClasses.find(klass => klass.name === name);
class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
}
beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });

// Valores conferidos no Codex Extra v1.1, pp. 41, 43, 49, 53, 57 e 59.
const expected = [
  ['Astrologer', 'Astrólogo', [0, 5, 0], [], [3, 3, 3, 1, 3]],
  ['Outlaw', 'Bandoleiro', [0, 0, 2], ['melee', 'ranged'], [5, 1, 3, 1, 3]],
  ['Magic Knight', 'Cavaleiro Mágico', [0, 5, 0], ['armor', 'shields'], [5, 3, 1, 3, 3]],
  ['Soul Smith', 'Forjador de Almas', [0, 0, 2], [], [4, 5, 1, 5, 1]],
  ['Crimson Blade', 'Lâmina Carmesim', [5, 0, 0], ['melee', 'shields'], [1, 1, 2, 4, 5]],
  ['Trickster', 'Malandro', [0, 0, 2], ['ranged'], [3, 1, 4, 3, 2]],
];

test('seis classes adicionais no livro bônus, sem duplicar Cartomante e Necromante', () => {
  assert.deepEqual(codexExtraClasses.map(klass => klass.name), expected.map(row => row[0]));
  const ids = new Set();
  for (const klass of codexExtraClasses) {
    assert.equal(klass.book, 'bonus');
    assert.equal(klass.source.title, 'Codex Extra');
    for (const skill of klass.skills) {
      assert.ok(!ids.has(skill.skillName)); ids.add(skill.skillName);
      assert.equal(skill.currentLvl, 0);
      assert.equal(typeof skill.specialSkill, 'string');
      assert.ok(codexExtraTranslations[skill.skillName]);
      assert.ok(codexExtraTranslations[skill.description]?.length > 50);
    }
  }
});

test('benefícios, permissões marciais e limites dos 30 poderes correspondem ao livro', () => {
  for (const [name, label, resources, martials, levels] of expected) {
    const klass = byName(name);
    assert.equal(codexExtraTranslations[name], label);
    assert.deepEqual([klass.benefits.hpplus, klass.benefits.mpplus, klass.benefits.ipplus], resources, label);
    assert.deepEqual(Object.entries(klass.benefits.martials).filter(([, enabled]) => enabled).map(([key]) => key).sort(), [...martials].sort(), label);
    assert.deepEqual(klass.skills.map(skill => skill.maxLvl), levels, label);
    assert.equal(klass.benefits.rituals.ritualism, false);
    assert.deepEqual(klass.benefits.spellClasses, []);
  }
});

test('níveis, benefícios e escolhas de um personagem não contaminam outro nem o catálogo', () => {
  const before = clone(codexExtraClasses);
  for (const template of codexExtraClasses) {
    const first = createPlayerClass(template);
    first.skills[0].currentLvl = 1;
    first.skills[0].description = 'Anotação individual';
    first.benefits.mpplus = 99;
    first.benefits.martials.melee = !first.benefits.martials.melee;
    first.source.pages = 'Referência pessoal';
    first.spells.push({ name: 'Escolha individual' });
    const second = createPlayerClass(template);
    assert.equal(second.lvl, 1);
    assert.equal(second.isHomebrew, false);
    assert.equal(second.skills[0].currentLvl, 0);
    assert.deepEqual(second.benefits, template.benefits);
    assert.deepEqual(second.source, template.source);
    assert.deepEqual(second.spells, []);
  }
  assert.deepEqual(codexExtraClasses, before);
});

test('Rasga-Mortalha só habilita Ritualismo quando aprendida e desabilita ao remover o nível', () => {
  const astrologer = createPlayerClass(byName('Astrologer'));
  const player = { classes: [astrologer] };
  assert.equal(canPerformRitualism(player), false);
  const ritual = astrologer.skills.find(skill => skill.specialSkill === 'Ritualism');
  ritual.currentLvl = '1';
  assert.equal(canPerformRitualism(player), true);
  ritual.currentLvl = 0;
  assert.equal(canPerformRitualism(player), false);
  assert.equal(canPerformRitualism({ classes: [{ benefits: { rituals: { ritualism: true } }, skills: [] }] }), true);
  assert.equal(canPerformRitualism({}), false);
});

test('classes novas exportam e reimportam na ficha original preservando dados e escolhas', () => {
  for (const template of codexExtraClasses) {
    const sheet = clone(pc);
    const klass = createPlayerClass(template);
    klass.skills[0].currentLvl = 1;
    // Extensões e escolhas particulares continuam válidas no JSON original.
    klass.choices = { notes: 'Forma de teste ou alma fictícia', counter: 2 };
    sheet.classes.push(klass);
    const parsed = parseSheets(JSON.stringify(sheet))[0];
    assert.deepEqual(parsed.sheet, sheet);
    const exported = exportSheet({ ...parsed, resources: parsed.resources });
    assert.deepEqual(parseSheets(JSON.stringify(exported))[0].sheet, sheet);
  }
});

test('personagem com Codex sincroniza recursos, recupera encontro e desfaz sem perder classes', () => {
  const sheet = clone(pc);
  sheet.classes.push(createPlayerClass(byName('Crimson Blade')));
  let encounterId, participantId, key;
  transaction(db => {
    const [candidate] = importCandidates(db, parseSheets(sheet), []);
    key = candidate.key;
    const encounter = createEncounter('Teste Codex Extra'); encounterId = encounter.id;
    db.encounters[encounter.id] = encounter;
    const participant = makeParticipant(db, encounter, candidate); participantId = participant.id;
    encounter.participants.push(participant);
  });
  changeEncounter(encounterId, 'Hemofagia: custo manual', encounter => operate(encounter, [participantId], 'hp', 'subtract', 10));
  const recovered = readDatabase();
  assert.equal(recovered.collections['player-personal'][key].stats.hp.current, sheet.stats.hp.current - 10);
  assert.deepEqual(recovered.collections['player-personal'][key].classes, sheet.classes);
  assert.deepEqual(recovered.encounters[encounterId].participants[0].sheet.classes, sheet.classes);
  undoEncounter(encounterId);
  assert.deepEqual(readDatabase().collections['player-personal'][key], sheet);
});
