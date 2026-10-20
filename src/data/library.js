import { clone, newId } from './localStore.js';
import { collectionFor, findDuplicates, validateSheet } from './sheets.js';
import { refreshLinks } from './encounters.js';

export function importCandidates(db, candidates, choices) {
  return candidates.flatMap((candidate, index) => {
    const choice = choices[index] || {};
    if (choice.selected === false) return [];
    const validated = validateSheet(candidate.sheet);
    const duplicates = findDuplicates(db, validated);
    const duplicate = choice.existingKey ? duplicates.find(entry => entry.key === choice.existingKey) : duplicates[0];
    if (choice.existingKey && !duplicate) throw new Error('O registro selecionado mudou. Abra novamente a prévia da importação.');
    const collection = collectionFor(validated.kind);
    db.collections[collection] ||= {};
    if (duplicate && choice.action === 'skip') return [];
    if (duplicates.length > 1 && (!choice.action || ['existing', 'update'].includes(choice.action)) && !choice.existingKey) throw new Error('Há várias fichas semelhantes. Escolha qual registro usar/atualizar ou selecione “Criar cópia na biblioteca”.');
    if (duplicate && (!choice.action || choice.action === 'existing')) return [duplicate];
    const key = duplicate && choice.action === 'update' ? duplicate.key : newId();
    db.collections[collection][key] = clone(validated.sheet);
    refreshLinks(db, collection, key);
    return [{ ...validated, key }];
  });
}
