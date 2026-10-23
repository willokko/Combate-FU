import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateSheet } from '../src/data/sheets.js';

const input = process.argv[2];
if (!input) throw new Error('Informe o arquivo de captura pública.');
const captured = JSON.parse(await readFile(input, 'utf8'));
const directory = new URL('../public/compendium/', import.meta.url);
await mkdir(directory, { recursive: true });
const entries = [], excluded = [], packs = [];
const requested = captured.entries.filter(entry => ['pt-BR', 'en'].includes(entry.sheet.language));
for (const entry of requested) {
  try { validateSheet(entry.sheet); entries.push(entry); }
  catch (error) { excluded.push({ sourceId: entry.sourceId, name: entry.sheet.name, reason: error.message }); }
}
const summaries = [];
for (let offset = 0; offset < entries.length; offset += 100) {
  const group = entries.slice(offset, offset + 100);
  const text = JSON.stringify(Object.fromEntries(group.map(entry => [entry.sourceId, entry.sheet])));
  // Content-addressed packs remain safe across browser/deployment caches.
  const pack = `pack-${createHash('sha256').update(text).digest('hex').slice(0, 16)}.json`;
  await writeFile(new URL(pack, directory), text, 'utf8');
  packs.push(pack);
  for (const { sourceId, sheet } of group) {
    const { resources } = validateSheet(sheet);
    summaries.push({ sourceId, pack, name: sheet.name, lvl: Number(sheet.lvl), species: sheet.species,
      rank: sheet.rank || 'soldier', language: sheet.language || '', createdBy: sheet.createdBy || '',
      hp: resources.hp.max, mp: resources.mp.max });
  }
}
const catalog = { version: 1, source: captured.source, sourceUrl: captured.sourceUrl,
  capturedAt: captured.capturedAt, capturedCount: requested.length, excluded,
  languages: Object.fromEntries([...new Set(entries.map(e => e.sheet.language || ''))].map(language => [language, entries.filter(e => (e.sheet.language || '') === language).length])),
  entries: summaries };
await writeFile(new URL('index.json', directory), JSON.stringify(catalog), 'utf8');
// Only remove obsolete generated packs in this fixed project directory. Never
// traverse directories or touch captures, personal records, or other assets.
for (const filename of await readdir(directory)) if (/^pack-[a-f0-9]{16}\.json$/.test(filename) && !packs.includes(filename)) await unlink(new URL(filename, directory));
console.log(JSON.stringify({ included: entries.length, excluded, packs: packs.length, languages: catalog.languages }, null, 2));
