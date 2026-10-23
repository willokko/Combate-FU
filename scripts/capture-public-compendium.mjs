// Read only: this script never authenticates, changes rules, or writes to Firebase.
import { writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export function decodeFirestore(value) {
  if ('nullValue' in value) return null;
  for (const key of ['stringValue', 'booleanValue', 'doubleValue', 'referenceValue', 'bytesValue', 'geoPointValue']) {
    if (key in value) return value[key];
  }
  if ('integerValue' in value) {
    const number = Number(value.integerValue);
    if (!Number.isSafeInteger(number)) throw new Error('Inteiro fora do limite seguro no documento publicado.');
    return number;
  }
  if ('timestampValue' in value) {
    const milliseconds = Date.parse(value.timestampValue);
    if (!Number.isFinite(milliseconds)) throw new Error('Data inválida no documento publicado.');
    const fraction = /\.(\d+)Z$/.exec(value.timestampValue)?.[1] || '';
    return { seconds: Math.floor(milliseconds / 1000), nanoseconds: Number(fraction.padEnd(9, '0')) };
  }
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestore);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decodeFirestore(item)]));
  throw new Error(`Tipo Firestore não reconhecido: ${Object.keys(value).join(', ')}.`);
}

export async function capturePublicCompendium(output) {
  const endpoint = 'https://firestore.googleapis.com/v1/projects/fabula-ultima-helper/databases/(default)/documents:runQuery';
  const entries = [], ids = new Set();
  let cursor;
  while (true) {
    const structuredQuery = {
      from: [{ collectionId: 'npc-personal' }],
      where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } },
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
      limit: 100,
      ...(cursor ? { startAt: { values: [{ referenceValue: cursor }], before: false } } : {}),
    };
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery }), signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`Consulta pública recusada (${response.status}): ${data.error?.message || 'erro desconhecido'}`);
    const documents = data.flatMap(item => item.document ? [item.document] : []);
    for (const document of documents) {
      const sourceId = document.name.split('/').at(-1);
      if (ids.has(sourceId)) throw new Error('A paginação repetiu uma ficha. A captura anterior foi preservada.');
      const sheet = decodeFirestore({ mapValue: { fields: document.fields } });
      if (sheet.published !== true) throw new Error('Documento não publicado. A captura foi interrompida.');
      ids.add(sourceId);
      entries.push({ sourceId, sheet: { ...sheet, dataType: 'npc' } });
    }
    console.log(`Fichas públicas recebidas: ${entries.length}`);
    if (documents.length < 100) break;
    cursor = documents.at(-1).name;
    // Keep requests sequential and modest; do not hammer the community service.
    await new Promise(resolve => setTimeout(resolve, 250));
    if (entries.length >= 20000) throw new Error('Limite de segurança da captura atingido.');
  }
  if (!entries.length) throw new Error('Nenhuma ficha pública retornada. O arquivo anterior foi preservado.');
  const catalog = {
    version: 1, source: 'Fultimator — compêndio público da comunidade',
    sourceUrl: 'https://fultimator.com/npc-compedium',
    capturedAt: new Date().toISOString(),
    entries,
  };
  const target = resolve(output);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(`${target}.tmp`, JSON.stringify(catalog), 'utf8');
  await rename(`${target}.tmp`, target);
  console.log(JSON.stringify({ total: entries.length, bytes: Buffer.byteLength(JSON.stringify(catalog)), languages: Object.fromEntries([...new Set(entries.map(e => e.sheet.language))].map(language => [language, entries.filter(e => e.sheet.language === language).length])) }));
  return catalog;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = process.argv[2];
  if (!output) throw new Error('Informe o caminho do arquivo de captura.');
  await capturePublicCompendium(output);
}
