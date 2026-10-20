// Copy the actual defaults from the original gallery constructors, then add fictional content.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
mkdirSync('tests/fixtures', { recursive: true });
for (const [kind, path, marker] of [
  ['pc', 'src/routes/player-gallery/player-gallery.jsx', 'const addPlayer ='],
  ['npc', 'src/routes/npc-gallery/npc-gallery.jsx', 'const addNpc ='],
]) {
  const source = readFileSync(path, 'utf8').split(marker)[1];
  const body = source.split('const data = ')[1].split('\n    const ref =')[0].trim().replace(/;$/, '');
  const sheet = vm.runInNewContext(`(${body})`, { user: { uid: 'fictional-source-owner' } });
  sheet.dataType = kind;
  sheet.id = kind === 'pc' ? 'example-player' : 'example-adversary';
  sheet.name = kind === 'pc' ? 'Lia da Aurora' : 'Lobo de Cristal';
  if (kind === 'pc') {
    sheet.classes = [{ name: 'Guardian', lvl: 5, benefits: { hpplus: 5, mpplus: 0, ipplus: 0, martials: { armor: true, shields: true, melee: true, ranged: false }, rituals: {}, custom: [], spellClasses: ['default'] }, skills: [{ skillName: 'Protect', currentLvl: 1, maxLvl: 1, description: 'Exemplo fictício para verificar a preservação.' }], heroic: { name: '', description: '' }, spells: [] }];
    sheet.notes = [{ name: 'Campanha de teste', description: 'Conteúdo fictício.' }];
    sheet.customExtension = { nested: { keep: ['all', 'fields', 7] } };
  } else { sheet.rank = 'soldier'; sheet.spells = []; sheet.actions = []; sheet.special = []; sheet.notes = 'Adversário fictício.'; }
  writeFileSync(`tests/fixtures/${kind}.json`, JSON.stringify(sheet, null, 2) + '\n');
}
