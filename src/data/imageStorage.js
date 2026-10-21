// Internal storage envelope. Public sheet, encounter and backup JSON formats
// remain unchanged, with full images in imgurl. Old plain databases still load.
const TYPE = 'fultimator-image-storage';
const imageData = value => typeof value === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
const REFERENCE = '$fultimatorImage';

export function encodeDatabase(database) {
  const images = [], indices = new Map();
  const content = JSON.stringify(database, (key, value) => {
    if (key !== 'imgurl' || !imageData(value)) return value;
    if (!indices.has(value)) { indices.set(value, images.length); images.push(value); }
    return { [REFERENCE]: indices.get(value) };
  });
  if (!images.length) return content;
  return JSON.stringify({ dataType: TYPE, version: 1, images, database: JSON.parse(content) });
}

export function decodeDatabase(raw) {
  const stored = JSON.parse(raw);
  if (stored?.dataType !== TYPE) return stored;
  if (stored.version !== 1 || !stored.database || !Array.isArray(stored.images) || stored.images.some(value => !imageData(value))) {
    throw new Error('O armazenamento de imagens não é reconhecido. Restaure um backup válido.');
  }
  return JSON.parse(JSON.stringify(stored.database), (key, value) => {
    if (key !== 'imgurl' || !value || typeof value !== 'object' || !Object.hasOwn(value, REFERENCE)) return value;
    const index = value[REFERENCE];
    if (!Number.isSafeInteger(index) || index < 0 || index >= stored.images.length) throw new Error('Uma imagem salva está incompleta. Restaure um backup válido.');
    return stored.images[index];
  });
}
