import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import { CONDITIONS, RESOURCE_LABELS } from '../src/data/sheets.js';
const paths = [
  ...readdirSync('src/components/combatManager').map(name => `src/components/combatManager/${name}`),
  ...['LocalEncounters.jsx', 'LocalLibrary.jsx', 'CombatManager.jsx'].map(name => `src/routes/combat/${name}`),
];
const keys = new Set([...Object.values(CONDITIONS), ...Object.values(RESOURCE_LABELS), 'Rolagens locais: este endereço não compartilha resultados com outros dispositivos. O compartilhamento exige Firebase configurado.', 'O catálogo compartilhado de recursos requer Supabase. Os editores, as bibliotecas locais e o combate continuam disponíveis. Consulte a documentação para configurar seu próprio serviço.', 'O compêndio compartilhado original depende do Firebase. Nesta instalação, a busca usa apenas adversários publicados na biblioteca local. Para migrar conteúdo, exporte e importe as fichas; consulte a documentação para configurar um serviço remoto próprio.']);
function strings(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'StringLiteral') keys.add(node.value);
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(strings); else if (value && typeof value === 'object') strings(value);
}
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === 't') strings(node.arguments[0]);
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
}
paths.forEach(path => visit(parse(readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['jsx'] })));
writeFileSync('src/translation/combatManager.json', JSON.stringify([...keys].sort().map(key => ({ key, 'pt-BR': key, en: key })), null, 2) + '\n');
