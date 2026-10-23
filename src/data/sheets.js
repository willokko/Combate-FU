import { calcHP, calcMP } from '../libs/npcs.js';
import { clone } from './localStore.js';

export const CONDITIONS = { slow: 'Lento', dazed: 'Atordoado', enraged: 'Enfurecido', weak: 'Fraco', shaken: 'Abalado', poisoned: 'Envenenado', dexUp: 'DES aumentada', insUp: 'AST aumentada', migUp: 'VIG aumentado', wlpUp: 'VON aumentada' };
export const RESOURCE_LABELS = { hp: 'PV', mp: 'PM', ip: 'PI', fabula: 'Pontos de Fábula', ultima: 'Pontos de Ultima' };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function integer(value, label, min = 0, max = 100000000) {
  // Some original editors persist numeric input as a string. Preserve it in the sheet.
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim()) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new Error(`${label}: informe um número inteiro entre ${min} e ${max}.`);
  }
  return Number(value);
}
export function sheetKind(sheet) {
  if (!object(sheet)) throw new Error('A ficha deve ser um objeto JSON.');
  if (sheet.dataType && !['pc', 'npc'].includes(sheet.dataType)) throw new Error(`Tipo de arquivo não suportado: ${sheet.dataType}. Use uma ficha de personagem (pc) ou adversário (npc).`);
  const kind = sheet.dataType || (sheet.stats && sheet.classes ? 'pc' : sheet.species && sheet.attacks ? 'npc' : null);
  if (!kind) throw new Error('Não reconheci uma ficha do Fultimator. Exporte o JSON pelo menu de exportação da ficha.');
  return kind;
}
export function validateSheet(sheet) {
  const kind = sheetKind(sheet);
  if (typeof sheet.name !== 'string' || !sheet.name.trim()) throw new Error('A ficha precisa de um nome.');
  integer(sheet.lvl, 'Nível', 1, 999);
  if (!object(sheet.attributes)) throw new Error('A ficha não contém atributos válidos.');
  for (const key of ['dexterity', 'insight', 'might', kind === 'pc' ? 'willpower' : 'will']) {
    if (![6, 8, 10, 12].includes(Number(sheet.attributes[key]))) throw new Error(`Atributo ${key}: use um dado d6, d8, d10 ou d12.`);
  }
  if (kind === 'pc') {
    for (const key of ['info', 'stats', 'statuses', 'modifiers']) if (!object(sheet[key])) throw new Error(`Personagem sem o campo obrigatório ${key}.`);
    for (const key of ['classes', 'weapons', 'armor', 'notes']) if (!Array.isArray(sheet[key])) throw new Error(`Personagem: ${key} deve ser uma lista.`);
    for (const key of ['weapons', 'armor', 'notes', 'shields', 'accessories', 'customWeapons']) if (Array.isArray(sheet[key]) && sheet[key].some(item => !object(item))) throw new Error(`A lista ${key} contém um item inválido.`);
    for (const key of ['pronouns', 'identity', 'theme', 'origin', 'description', 'imgurl']) if (typeof sheet.info[key] !== 'string') throw new Error(`Informações do personagem: ${key} deve ser texto.`);
    if (!Array.isArray(sheet.info.bonds)) throw new Error('Os vínculos (info.bonds) devem ser uma lista.');
    for (const key of ['shields', 'accessories', 'customWeapons']) if (sheet[key] !== undefined && !Array.isArray(sheet[key])) throw new Error(`Equipamento ${key}: use uma lista.`);
    for (const klass of sheet.classes) if (!object(klass) || typeof klass.name !== 'string' || !object(klass.benefits) || !Array.isArray(klass.skills) || (klass.spells !== undefined && !Array.isArray(klass.spells))) throw new Error('Uma classe está incompleta. Verifique nome, benefícios, habilidades e magias.');
    for (const key of ['hp', 'mp', 'ip']) {
      if (!object(sheet.stats[key])) throw new Error(`Recurso ausente: ${RESOURCE_LABELS[key]}.`);
      const max = integer(sheet.stats[key].max, `${RESOURCE_LABELS[key]} máximos`, key === 'hp' ? 1 : 0);
      integer(sheet.stats[key].current, `${RESOURCE_LABELS[key]} atuais`, 0, max);
    }
    if (sheet.info.fabulapoints !== undefined) integer(sheet.info.fabulapoints, 'Pontos de Fábula', 0, 9999);
    for (const [key, value] of Object.entries(sheet.stats)) if (!['hp', 'mp', 'ip'].includes(key) && object(value) && value.current !== undefined && value.max !== undefined) {
      const max = integer(value.max, `${key} máximo`); integer(value.current, `${key} atual`, 0, max);
    }
  } else {
    if (!Array.isArray(sheet.attacks) || !object(sheet.affinities) || typeof sheet.species !== 'string') throw new Error('Adversário: verifique espécie, ataques e afinidades.');
    for (const key of ['spells', 'actions', 'special']) if (sheet[key] !== undefined && !Array.isArray(sheet[key])) throw new Error(`Adversário: ${key} deve ser uma lista.`);
    for (const key of ['attacks', 'spells', 'actions', 'special']) if (sheet[key]?.some(item => !object(item))) throw new Error(`Adversário: a lista ${key} contém um item inválido.`);
    // The original NPC editor supports negative adjustments; validate the final
    // resources below instead of rejecting an otherwise valid exported sheet.
    for (const key of ['hp', 'mp']) if (sheet.extra?.[key] !== undefined && sheet.extra[key] !== '') integer(sheet.extra[key], `Bônus de ${key}`, -100000000);
    const resources = resourcesFor(sheet, 'npc');
    integer(resources.hp.max, 'PV calculados', 1);
    integer(resources.mp.max, 'PM calculados');
  }
  return { kind, sheet: clone(sheet), resources: resourcesFor(sheet, kind) };
}
export function parseSheets(input) {
  if (typeof input === 'string' && input.length > 20 * 1024 * 1024) throw new Error('O JSON excede 20 MB. Divida a coleção.');
  let data;
  try { data = typeof input === 'string' ? JSON.parse(input) : input; }
  catch { throw new Error('JSON inválido. Confira aspas, vírgulas e chaves. Nenhum dado foi alterado.'); }
  const list = Array.isArray(data) ? data : [data];
  if (!list.length || list.length > 500) throw new Error('Importe entre 1 e 500 fichas por vez.');
  return list.map((sheet, index) => {
    try { return validateSheet(sheet); }
    catch (error) { throw new Error(`Ficha ${index + 1}: ${error.message}`); }
  });
}
export function resourcesFor(sheet, kind = sheetKind(sheet)) {
  if (kind === 'pc') {
    const resources = {};
    for (const [key, value] of Object.entries(sheet.stats)) {
      if (object(value) && Number.isSafeInteger(Number(value.current)) && Number.isSafeInteger(Number(value.max)) && Number(value.max) >= 0) resources[key] = { current: Number(value.current), max: Number(value.max) };
    }
    if (sheet.info.fabulapoints !== undefined) resources.fabula = { current: Number(sheet.info.fabulapoints), max: 9999 };
    return resources;
  }
  const numericNpc = { ...sheet, lvl: Number(sheet.lvl), attributes: Object.fromEntries(Object.entries(sheet.attributes).map(([key, value]) => [key, Number(value)])) };
  const hp = calcHP(numericNpc), mp = calcMP(numericNpc);
  const resources = { hp: { current: hp, max: hp }, mp: { current: mp, max: mp } };
  const ultima = { minor: 5, major: 10, superme: 15, supreme: 15 }[sheet.villain];
  if (ultima !== undefined) resources.ultima = { current: ultima, max: ultima };
  return resources;
}
export function turnsFor(sheet, kind = sheetKind(sheet)) {
  return kind === 'pc' ? 1 : sheet.rank === 'elite' ? 2 : Number(/^champion([1-6])$/.exec(sheet.rank)?.[1] || 1);
}
export function applyResources(sheet, resources, keys = Object.keys(resources)) {
  const result = clone(sheet);
  if (sheetKind(sheet) === 'pc') for (const key of keys) {
    if (key === 'fabula' && result.info.fabulapoints !== undefined) result.info.fabulapoints = resources[key].current;
    else if (result.stats[key]?.current !== undefined) result.stats[key].current = Math.min(resources[key].current, Number(result.stats[key].max));
  }
  return result;
}
export const collectionFor = kind => kind === 'pc' ? 'player-personal' : 'npc-personal';
export function libraryEntries(db, kind) {
  return Object.entries(db.collections[collectionFor(kind)] || {}).map(([key, sheet]) => ({ key, kind, sheet }));
}
export function findDuplicates(db, candidate) {
  const entries = libraryEntries(db, candidate.kind);
  const ids = candidate.sheet.id ? entries.filter(entry => entry.sheet.id === candidate.sheet.id) : [];
  if (ids.length) return ids;
  return entries.filter(entry =>
    JSON.stringify(entry.sheet) === JSON.stringify(candidate.sheet) ||
    entry.sheet.name.trim().toLocaleLowerCase() === candidate.sheet.name.trim().toLocaleLowerCase());
}
export const findDuplicate = (db, candidate) => findDuplicates(db, candidate)[0];
export const isCrisis = participant => participant.resources.hp.current <= Math.floor(participant.resources.hp.max / 2);
export function exportSheet(participant) {
  // NPC encounter-only resources have no fields in the upstream NPC JSON model.
  return { ...applyResources(participant.sheet, participant.resources), dataType: participant.kind };
}
