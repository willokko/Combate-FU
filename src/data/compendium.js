import { validateSheet } from './sheets.js';

export const normalizeSearch = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
export function searchCompendium(entries, { search = '', language = '', species = '', rank = '', minLevel = 1, maxLevel = 999 } = {}) {
  const terms = normalizeSearch(search).trim().split(/\s+/).filter(Boolean);
  return entries.filter(entry => (!language || entry.language === language)
    && (!species || entry.species === species) && (!rank || entry.rank === rank)
    && entry.lvl >= Number(minLevel || 1) && entry.lvl <= Number(maxLevel || 999)
    && terms.every(term => normalizeSearch(`${entry.name} ${entry.createdBy}`).includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.sourceId.localeCompare(b.sourceId));
}

export function createCompendiumClient({ base = import.meta.env?.BASE_URL || '/', fetcher = globalThis.fetch } = {}) {
  const cache = new Map();
  const load = filename => {
    if (!cache.has(filename)) cache.set(filename, (async () => {
      const response = await fetcher(`${base.replace(/\/?$/, '/')}compendium/${filename}`);
      if (!response.ok) throw new Error('Não foi possível carregar o compêndio. Confira sua conexão e tente novamente.');
      return response.json();
    })().catch(error => { cache.delete(filename); throw error; }));
    return cache.get(filename);
  };
  return {
    async index() {
      const index = await load('index.json');
      if (index.version !== 1 || !Array.isArray(index.entries) || !index.entries.length) throw new Error('O índice do compêndio não é reconhecido.');
      return index;
    },
    async sheet(entry) {
      if (!/^pack-[a-f0-9]{16}\.json$/.test(entry.pack)) throw new Error('Arquivo de compêndio inválido.');
      const pack = await load(entry.pack);
      const candidate = validateSheet(pack[entry.sourceId]);
      if (candidate.kind !== 'npc' || candidate.sheet.published !== true || candidate.sheet.name !== entry.name) throw new Error('A ficha não corresponde ao índice do compêndio.');
      return candidate;
    },
  };
}

export const compendium = createCompendiumClient();
