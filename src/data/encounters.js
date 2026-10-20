import { clone, newId, transaction } from './localStore.js';
import { applyResources, collectionFor, integer, resourcesFor, turnsFor, validateSheet } from './sheets.js';

export const ENCOUNTER_VERSION = 1;
const snapshot = encounter => { const copy = clone(encounter); delete copy.history; return copy; };
export function createEncounter(name = 'Novo encontro') {
  return { version: ENCOUNTER_VERSION, id: newId(), name: name.trim() || 'Novo encontro', round: 1, activeSide: 'heroes', firstSide: 'heroes', participants: [], clocks: [], notes: '', ended: false, history: [], updatedAt: new Date().toISOString() };
}
export function linkedElsewhere(db, key) {
  return Object.values(db.encounters).flatMap(encounter => encounter.ended ? [] : encounter.participants.filter(p => p.link?.key === key).map(p => ({ encounter, participant: p })));
}
export function makeParticipant(db, encounter, candidate, options = {}) {
  let { sheet, kind } = candidate;
  const key = candidate.key;
  const linked = kind === 'pc' && key && !options.independent;
  if (linked && linkedElsewhere(db, key).length) throw new Error('Este personagem já está vinculado a um encontro ativo. Escolha “Usar cópia independente” ou encerre o outro encontro.');
  if (key) sheet = db.collections[collectionFor(kind)]?.[key] || sheet;
  validateSheet(sheet);
  const count = encounter.participants.filter(p => p.sheet.name === sheet.name).length;
  return { id: newId(), kind, sheet: clone(sheet), label: `${sheet.name}${count ? ` #${count + 1}` : ''}`, side: options.side || (kind === 'pc' ? 'heroes' : 'foes'), link: linked ? { key, collection: collectionFor(kind) } : null, resources: resourcesFor(sheet, kind), conditions: kind === 'pc' ? Object.keys(sheet.statuses).filter(key => sheet.statuses[key]) : [], effects: '', notes: '', turns: turnsFor(sheet, kind), acted: 0 };
}
export function changeEncounter(id, label, mutate, { allowEnded = false } = {}) {
  return transaction(db => {
    const encounter = db.encounters[id];
    if (!encounter) throw new Error('Encontro não encontrado.');
    if (encounter.ended && !allowEnded) throw new Error('Este encontro está encerrado. Reabra-o antes de alterar os participantes ou recursos.');
    const before = snapshot(encounter);
    mutate(encounter, db);
    const writes = [];
    for (const participant of encounter.participants) {
      const old = before.participants.find(p => p.id === participant.id);
      if (!participant.link || !old || before.ended) continue;
      const changed = Object.keys(participant.resources).filter(key => old.resources[key]?.current !== participant.resources[key].current);
      if (!changed.length) continue;
      const { collection, key } = participant.link;
      const sheet = db.collections[collection]?.[key];
      if (!sheet) throw new Error('A ficha vinculada não está na biblioteca. Use uma cópia independente.');
      const libraryResources = resourcesFor(sheet);
      for (const resource of changed) {
        if (libraryResources[resource]?.current !== old.resources[resource]?.current) throw new Error('A ficha foi alterada fora deste encontro. Recarregue os recursos pela biblioteca antes de continuar.');
        writes.push({ collection, key, resource, before: libraryResources[resource].current, after: participant.resources[resource].current });
      }
      db.collections[collection][key] = applyResources(sheet, participant.resources, changed);
      participant.sheet = clone(db.collections[collection][key]);
    }
    encounter.history = [...(encounter.history || []).slice(-19), { id: newId(), label, at: new Date().toISOString(), before, writes }];
    encounter.updatedAt = new Date().toISOString();
  });
}
export function undoEncounter(id) {
  return transaction(db => {
    const encounter = db.encounters[id], entry = encounter?.history?.at(-1);
    if (!entry) throw new Error('Não há alteração para desfazer.');
    // Do not resurrect a link that is now owned by a different active encounter.
    for (const p of entry.before.participants) if (p.link && linkedElsewhere(db, p.link.key).some(item => item.encounter.id !== id)) throw new Error('Não é possível restaurar um vínculo usado por outro encontro.');
    for (const write of entry.writes) {
      const sheet = db.collections[write.collection]?.[write.key];
      if (!sheet) throw new Error('A ficha vinculada foi removida. Não é possível desfazer a sincronização.');
      const resources = resourcesFor(sheet);
      if (resources[write.resource]?.current !== write.after || write.before > resources[write.resource].max) throw new Error('A ficha mudou depois desta ação. O desfazer não pode substituir essa alteração.');
      resources[write.resource].current = write.before;
      db.collections[write.collection][write.key] = applyResources(sheet, resources, [write.resource]);
    }
    db.encounters[id] = { ...entry.before, history: encounter.history.slice(0, -1), updatedAt: new Date().toISOString() };
    for (const p of db.encounters[id].participants) if (p.link) {
      const sheet = db.collections[p.link.collection]?.[p.link.key];
      if (sheet) { p.sheet = clone(sheet); p.resources = resourcesFor(sheet, p.kind); }
    }
  });
}
export function operate(encounter, ids, resource, operation, value) {
  const amount = integer(value, 'Valor');
  if (!['add', 'subtract', 'set'].includes(operation)) throw new Error('Operação inválida.');
  for (const participant of encounter.participants.filter(p => ids.includes(p.id))) {
    const stat = participant.resources[resource];
    if (!stat) throw new Error(`${participant.label} não possui esse recurso. Selecione alvos compatíveis.`);
    if (operation === 'subtract' && resource !== 'hp' && amount > stat.current) throw new Error(`${participant.label}: ${resource.toUpperCase()} insuficientes para pagar o custo completo.`);
    if (operation === 'set' && amount > stat.max) throw new Error(`${participant.label}: o valor não pode exceder ${stat.max}.`);
    stat.current = Math.max(0, Math.min(stat.max, operation === 'set' ? amount : stat.current + (operation === 'add' ? amount : -amount)));
  }
}
export function markTurn(encounter, id) {
  const participant = encounter.participants.find(p => p.id === id);
  if (!participant || participant.acted >= participant.turns) return;
  participant.acted++;
  const opposite = participant.side === 'heroes' ? 'foes' : 'heroes';
  encounter.activeSide = encounter.participants.some(p => p.side === opposite && p.acted < p.turns && p.resources.hp.current > 0) ? opposite : participant.side;
}
export function nextRound(encounter) {
  encounter.round++;
  encounter.activeSide = encounter.firstSide;
  encounter.participants.forEach(p => { p.acted = 0; });
}
export function refreshLinks(db, collection, key) {
  const sheet = db.collections[collection]?.[key];
  for (const encounter of Object.values(db.encounters)) for (const p of encounter.participants) {
    if (p.link?.collection === collection && p.link.key === key && !encounter.ended) {
      p.sheet = clone(sheet);
      p.resources = resourcesFor(sheet, p.kind);
    }
  }
}
export function parseEncounter(input) {
  let data;
  try { data = typeof input === 'string' ? JSON.parse(input) : clone(input); }
  catch { throw new Error('JSON de encontro inválido. Nenhum encontro foi alterado.'); }
  // Version 0 was the original simulator's reference-only Firestore document.
  if (!data.version && Array.isArray(data.selectedNPCs)) throw new Error('Este encontro antigo contém apenas referências às fichas. Abra-o no simulador original e exporte as fichas para montar um encontro completo.');
  if (data.dataType !== 'fultimator-encounter' || data.version !== ENCOUNTER_VERSION || !Array.isArray(data.participants)) throw new Error('Formato ou versão de encontro não suportado.');
  if (data.participants.length > 200 || typeof data.name !== 'string') throw new Error('Encontro inválido: verifique nome e participantes (máximo 200).');
  data.round = integer(data.round, 'Rodada', 1);
  if (!['heroes', 'foes'].includes(data.activeSide) || !['heroes', 'foes'].includes(data.firstSide)) throw new Error('Lado do encontro inválido.');
  data.participants = data.participants.map(p => {
    const { kind } = validateSheet(p.sheet);
    if (kind !== p.kind || !['heroes', 'foes'].includes(p.side) || typeof p.label !== 'string') throw new Error('Participante inválido.');
    const expected = resourcesFor(p.sheet, kind);
    if (!p.resources || Object.keys(expected).some(key => !p.resources[key])) throw new Error('Recursos do participante incompletos.');
    for (const [key, stat] of Object.entries(p.resources)) {
      if (!expected[key] || !stat) throw new Error('Recurso desconhecido no encontro.');
      const max = integer(stat.max, 'Máximo do recurso', key === 'hp' ? 1 : 0);
      if (max !== expected[key].max) throw new Error('O máximo do recurso não corresponde à ficha.');
      stat.max = max; stat.current = integer(stat.current, 'Recurso atual', 0, max);
    }
    p.turns = integer(p.turns, 'Turnos', 1, 20); p.acted = integer(p.acted, 'Turnos realizados', 0, p.turns);
    if (!Array.isArray(p.conditions) || p.conditions.some(c => typeof c !== 'string') || typeof p.notes !== 'string' || typeof p.effects !== 'string') throw new Error('Condições ou notas inválidas.');
    // Imported encounters are portable snapshots: never silently link to local IDs.
    return { ...p, id: newId(), link: null };
  });
  if (!Array.isArray(data.clocks) || data.clocks.length > 9 || typeof data.notes !== 'string') throw new Error('Notas ou relógios inválidos.');
  data.clocks.forEach(clock => {
    clock.sections = integer(clock.sections, 'Seções do relógio', 2, 12);
    if (typeof clock.name !== 'string' || !Array.isArray(clock.state) || clock.state.length !== clock.sections || clock.state.some(v => typeof v !== 'boolean')) throw new Error('Relógio inválido.');
  });
  return { ...data, id: newId(), ended: Boolean(data.ended), history: [], updatedAt: new Date().toISOString() };
}
export function exportEncounter(encounter) { return { ...snapshot(encounter), dataType: 'fultimator-encounter' }; }
export function exportBackup(db) { return { dataType: 'fultimator-local-backup', version: 1, database: { version: 1, revision: db.revision, collections: { 'player-personal': clone(db.collections['player-personal'] || {}), 'npc-personal': clone(db.collections['npc-personal'] || {}) }, encounters: clone(db.encounters) } }; }
export function restoreBackup(input) {
  let backup;
  try { backup = JSON.parse(input); } catch { throw new Error('Backup inválido: o arquivo não contém JSON válido.'); }
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!object(backup) || backup.dataType !== 'fultimator-local-backup' || backup.version !== 1 || backup.database?.version !== 1 || !object(backup.database.collections) || !object(backup.database.encounters)) throw new Error('Versão ou formato de backup não reconhecido.');
  // Validate everything BEFORE the atomic merge. Restore as copies, preserving current data.
  const sheets = [];
  for (const kind of ['pc', 'npc']) {
    const records = backup.database.collections[collectionFor(kind)] || {};
    if (!object(records)) throw new Error('A biblioteca no backup está inválida.');
    for (const sheet of Object.values(records)) {
      const validated = validateSheet(sheet);
      if (validated.kind !== kind) throw new Error('O backup contém uma ficha na biblioteca incorreta.');
      sheets.push(validated);
    }
  }
  const encounters = Object.values(backup.database.encounters).map(e => parseEncounter(exportEncounter(e)));
  return transaction(db => {
    for (const candidate of sheets) {
      const collection = collectionFor(candidate.kind);
      db.collections[collection] ||= {};
      if (!Object.values(db.collections[collection]).some(sheet => JSON.stringify(sheet) === JSON.stringify(candidate.sheet))) db.collections[collection][newId()] = candidate.sheet;
    }
    encounters.forEach(e => { db.encounters[e.id] = e; });
  });
}
