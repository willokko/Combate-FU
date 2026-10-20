import React, { useState } from 'react';
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useLocalDatabase } from '../../data/hooks.js';
import { libraryEntries, findDuplicates, parseSheets, RESOURCE_LABELS, resourcesFor } from '../../data/sheets.js';
import { transaction } from '../../data/localStore.js';
import { changeEncounter, linkedElsewhere, makeParticipant } from '../../data/encounters.js';
import { importCandidates } from '../../data/library.js';
import { readSheetFiles } from '../../data/files.js';
import { t } from '../../translation/translate';

export default function ParticipantPicker({ open, onClose, encounterId, initialCandidates = [], libraryOnly = false }) {
  const db = useLocalDatabase();
  const [tab, setTab] = useState(initialCandidates.length || libraryOnly ? 2 : 0);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [imported, setImported] = useState(initialCandidates);
  const [choices, setChoices] = useState({});
  const [selected, setSelected] = useState({});
  const [error, setError] = useState('');
  const [saveLibrary, setSaveLibrary] = useState(true);
  const [busy, setBusy] = useState(false);
  const candidates = tab < 2 ? libraryEntries(db, tab === 0 ? 'pc' : 'npc').filter(c => c.sheet.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())) : imported;
  const updateChoice = (id, patch) => setChoices(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const keyFor = (candidate, index) => tab < 2 ? candidate.key : `import-${index}`;
  const preview = async action => {
    setError(''); setBusy(true); setImported([]);
    try { setImported(await action()); setChoices({}); setSelected({}); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const finish = () => {
    try {
      const entries = tab < 2 ? [...libraryEntries(db, 'pc'), ...libraryEntries(db, 'npc')].filter(c => selected[c.key]) : imported.filter((_, index) => selected[`import-${index}`] !== false);
      if (!entries.length) throw new Error('Selecione ao menos uma ficha.');
      const mutate = (encounter, draft) => {
        for (const candidate of entries) {
          const index = imported.indexOf(candidate);
          const choice = choices[tab < 2 ? candidate.key : `import-${index}`] || {};
          let resolved = candidate;
          if (tab >= 2 && (saveLibrary || libraryOnly)) resolved = importCandidates(draft, [candidate], [choice])[0];
          if (!resolved) continue;
          if (!encounter || libraryOnly) continue;
          const count = candidate.kind === 'npc' ? Number(choice.quantity || 1) : 1;
          if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error('A quantidade de cópias deve estar entre 1 e 30.');
          if (encounter.participants.length + count > 200) throw new Error('O limite é de 200 participantes por encontro.');
          for (let i = 0; i < count; i++) encounter.participants.push(makeParticipant(draft, encounter, resolved, choice));
        }
      };
      if (encounterId && !libraryOnly) changeEncounter(encounterId, t('Participantes adicionados'), mutate);
      else transaction(draft => mutate(null, draft));
      onClose(true);
    } catch (error) { setError(error.message); }
  };
  return <Dialog open={open} onClose={() => onClose()} maxWidth="md" fullWidth aria-labelledby="participant-picker-title">
    <DialogTitle id="participant-picker-title">{t(libraryOnly ? 'Importar fichas para a biblioteca' : 'Adicionar participante')}</DialogTitle>
    <DialogContent>
      <Alert severity="info" sx={{ mb: 2 }}>{t('Esta biblioteca pertence a este navegador e instalação. Migre fichas do Fultimator original por exportação e importação.')}</Alert>
      <Tabs value={tab} onChange={(_, value) => { setTab(value); setError(''); }} variant="scrollable" allowScrollButtonsMobile aria-label={t('Origem das fichas')}>
        <Tab disabled={libraryOnly} label={t('Personagens da biblioteca')} /><Tab disabled={libraryOnly} label={t('Adversários da biblioteca')} /><Tab label={t('Importar arquivo JSON')} /><Tab label={t('Colar JSON')} />
      </Tabs>
      {tab < 2 && <TextField label={t('Pesquisar por nome')} fullWidth value={search} onChange={e => setSearch(e.target.value)} sx={{ my: 2 }} />}
      {tab === 2 && <Button component="label" variant="outlined" sx={{ my: 2 }} disabled={busy}>{t('Selecionar arquivos JSON ou ZIP')}<input type="file" hidden multiple accept=".json,.zip,application/json,application/zip" onChange={e => { const files = [...e.target.files]; e.target.value = ''; preview(() => readSheetFiles(files)); }} /></Button>}
      {tab === 3 && <Stack spacing={1} sx={{ my: 2 }}>
        <TextField multiline minRows={5} maxRows={12} label={t('Cole aqui o JSON completo')} value={text} onChange={e => { setText(e.target.value); setImported([]); }} />
        <Stack direction="row" gap={1} flexWrap="wrap"><Button variant="outlined" onClick={() => preview(() => parseSheets(text))}>{t('Validar e visualizar')}</Button><Button onClick={async () => { try { if (!navigator.clipboard?.readText) throw new Error(); const value = await navigator.clipboard.readText(); setText(value); preview(() => parseSheets(value)); } catch { setError(t('Não foi possível ler a área de transferência. Cole o JSON manualmente no campo acima.')); } }}>{t('Colar da área de transferência')}</Button></Stack>
      </Stack>}
      {error && <Alert severity="error" role="alert" sx={{ my: 1 }}>{error}</Alert>}
      {tab >= 2 && candidates.length > 0 && !libraryOnly && <FormControlLabel control={<Checkbox checked={saveLibrary} onChange={e => setSaveLibrary(e.target.checked)} />} label={t('Salvar fichas na biblioteca local e vincular personagens')} />}
      {tab < 2 && !candidates.length && <Typography sx={{ py: 3 }}>{t('Nenhuma ficha encontrada. Crie uma ficha no editor original ou importe um JSON.')}</Typography>}
      <Stack spacing={1}>
        {candidates.map((candidate, index) => {
          const key = keyFor(candidate, index), choice = choices[key] || {};
          const duplicates = tab >= 2 ? findDuplicates(db, candidate) : [];
          const duplicate = duplicates.find(entry => entry.key === choice.existingKey) || duplicates[0];
          const isSelected = tab < 2 ? Boolean(selected[key]) : selected[key] !== false;
          const linkKey = candidate.key || (duplicate && choice.action !== 'copy' ? duplicate.key : null);
          const links = linkKey ? linkedElsewhere(db, linkKey) : [];
          return <Paper variant="outlined" sx={{ p: 1.5 }} key={key}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Checkbox checked={isSelected} inputProps={{ 'aria-label': `${t('Selecionar')} ${candidate.sheet.name}` }} onChange={e => setSelected(prev => ({ ...prev, [key]: e.target.checked }))} />
              <Box flex={1}><Typography fontWeight="bold">{candidate.sheet.name}</Typography><Typography variant="body2">{t(candidate.kind === 'pc' ? 'Personagem' : 'Adversário')} · {t('Nível')} {candidate.sheet.lvl} · {Object.entries(resourcesFor(candidate.sheet)).map(([key, value]) => `${RESOURCE_LABELS[key] || key} ${value.current}/${value.max}`).join(' · ')}</Typography></Box>
            </Stack>
            {isSelected && <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ mt: 1 }}>
              <TextField select size="small" label={t('Lado')} value={choice.side || (candidate.kind === 'pc' ? 'heroes' : 'foes')} onChange={e => updateChoice(key, { side: e.target.value })} sx={{ minWidth: 140 }}><MenuItem value="heroes">{t('Heróis')}</MenuItem><MenuItem value="foes">{t('Adversários')}</MenuItem></TextField>
              {candidate.kind === 'npc' ? <TextField type="number" size="small" label={t('Quantidade de cópias')} inputProps={{ min: 1, max: 30 }} value={choice.quantity ?? 1} onChange={e => updateChoice(key, { quantity: e.target.value })} /> : !libraryOnly && <FormControlLabel control={<Checkbox checked={Boolean(choice.independent)} onChange={e => updateChoice(key, { independent: e.target.checked })} />} label={t('Usar cópia independente')} />}
            </Stack>}
            {links.length > 0 && <Alert severity="warning" sx={{ mt: 1 }}>{t('Vinculado a encontro ativo:')} {links.map(l => l.encounter.name).join(', ')}. {t('Selecione “Usar cópia independente” para adicionar novamente.')}</Alert>}
            {duplicate && isSelected && (saveLibrary || libraryOnly) && <TextField select fullWidth size="small" label={`${t('Registro semelhante na biblioteca:')} ${duplicate.sheet.name}`} sx={{ mt: 2 }} value={choice.action || 'existing'} onChange={e => updateChoice(key, { action: e.target.value })}>
              <MenuItem value="existing">{t('Usar registro existente sem alterar')}</MenuItem><MenuItem value="update">{t('Atualizar registro existente com esta ficha')}</MenuItem><MenuItem value="copy">{t('Criar cópia na biblioteca')}</MenuItem><MenuItem value="skip">{t('Não importar esta ficha')}</MenuItem>
            </TextField>}
            {duplicates.length > 1 && isSelected && (saveLibrary || libraryOnly) && (!choice.action || ['existing', 'update'].includes(choice.action)) && <TextField select fullWidth size="small" sx={{ mt: 2 }} label={t('Escolha o registro existente')} value={choice.existingKey || ''} onChange={e => updateChoice(key, { existingKey: e.target.value })}>
              {duplicates.map(entry => <MenuItem key={entry.key} value={entry.key}>{entry.sheet.name} · {entry.key.slice(0, 8)} · {Object.entries(resourcesFor(entry.sheet)).slice(0, 3).map(([key, stat]) => `${RESOURCE_LABELS[key] || key} ${stat.current}/${stat.max}`).join(' · ')}</MenuItem>)}
            </TextField>}
          </Paper>;
        })}
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={() => onClose()}>{t('Cancelar')}</Button><Button variant="contained" disabled={busy || (tab >= 2 && !imported.length) || (tab < 2 && !Object.values(selected).some(Boolean))} onClick={finish}>{t(libraryOnly ? 'Salvar na biblioteca' : 'Adicionar selecionados')}</Button></DialogActions>
  </Dialog>;
}
