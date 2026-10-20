import React, { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Grid, MenuItem, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { Add, ExpandMore, Undo, UploadFile, Download, AccessTime } from '@mui/icons-material';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import ParticipantPicker from '../../components/combatManager/ParticipantPicker.jsx';
import ParticipantCard from '../../components/combatManager/ParticipantCard.jsx';
import ParticipantDetails from '../../components/combatManager/ParticipantDetails.jsx';
import EncounterImport from '../../components/combatManager/EncounterImport.jsx';
import CombatSimClocks from '../../components/combatSim/CombatSimClocks.jsx';
import { useLocalDatabase } from '../../data/hooks.js';
import { changeEncounter, linkedElsewhere, markTurn, nextRound, operate, undoEncounter } from '../../data/encounters.js';
import { exportEncounter } from '../../data/encounters.js';
import { CONDITIONS, exportSheet, RESOURCE_LABELS, resourcesFor } from '../../data/sheets.js';
import { downloadJSON } from '../../data/files.js';
import { t } from '../../translation/translate';

export default function CombatManager() {
  const { id } = useParams(), db = useLocalDatabase(), encounter = db.encounters[id];
  const [adding, setAdding] = useState(false), [importing, setImporting] = useState(false), [clocks, setClocks] = useState(false);
  const [detail, setDetail] = useState(null), [selected, setSelected] = useState([]), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [amount, setAmount] = useState('10'), [resource, setResource] = useState('hp'), [operation, setOperation] = useState('subtract');
  const [savingParticipant, setSavingParticipant] = useState(null);
  const [condition, setCondition] = useState('slow');
  const notify = message => { setMessage(message); setError(''); };
  const change = (label, mutate, options) => { try { changeEncounter(id, label, mutate, options); notify(t('Alteração salva automaticamente.')); } catch (error) { setError(error.message); } };
  if (!encounter) return <Layout><Alert severity="warning">{t('Encontro não encontrado. Importe um backup ou abra a lista de encontros.')}</Alert><Button component={Link} to="/combat-sim">{t('Ver encontros')}</Button></Layout>;
  const p = encounter.participants.find(p => p.id === detail);
  const targetIds = selected.filter(id => encounter.participants.some(p => p.id === id));
  const apply = (ids, key, op, value) => change(`${t(RESOURCE_LABELS[key] || key)} ${t({ add: 'Somar (+)', subtract: 'Subtrair (−)', set: 'Definir (=)' }[op])} ${value} · ${ids.map(id => encounter.participants.find(p => p.id === id)?.label).join(', ')}`, e => operate(e, ids, key, op, value));
  const patchParticipant = (participant, patch) => change(`${t('Ajustar participante')}: ${participant.label}`, e => Object.assign(e.participants.find(p => p.id === participant.id), patch));
  const remaining = encounter.participants.filter(p => p.resources.hp.current > 0).reduce((sum, p) => sum + Math.max(0, p.turns - p.acted), 0);
  const end = () => change(t(encounter.ended ? 'Reabrir encontro' : 'Encerrar encontro'), (e, draft) => {
    if (e.ended) {
      for (const p of e.participants) if (p.link) {
        if (linkedElsewhere(draft, p.link.key).length) throw new Error(t('Há um vínculo concorrente. Use cópias independentes antes de reabrir este encontro.'));
        const sheet = draft.collections[p.link.collection]?.[p.link.key];
        if (!sheet) throw new Error(t('A ficha vinculada não existe mais. Use cópia independente.'));
        p.sheet = sheet; p.resources = resourcesFor(sheet);
      }
    }
    e.ended = !e.ended;
  }, { allowEnded: true });
  const bulkCondition = add => change(t(add ? 'Adicionar condição aos alvos' : 'Remover condição dos alvos'), e => {
    for (const p of e.participants.filter(p => targetIds.includes(p.id))) {
      if (add && !p.sheet.immunities?.[condition] && !p.conditions.includes(condition)) p.conditions.push(condition);
      if (!add) p.conditions = p.conditions.filter(key => key !== condition);
    }
  });
  return <Layout fullWidth><Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1800, mx: 'auto', '& .MuiButton-root': { minHeight: 42 } }}>
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, borderTop: 4, borderTopColor: 'primary.main' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }}><TextField variant="standard" label={t('Nome do encontro')} value={encounter.name} onChange={e => change(t('Renomear encontro'), c => { c.name = e.target.value; })} inputProps={{ maxLength: 200 }} sx={{ flex: 1, '& input': { fontSize: 24, fontWeight: 'bold' } }} />
          <Chip variant="outlined" label={t(encounter.ended ? 'Encontro encerrado · recursos mantidos' : 'Salvo neste navegador')} />
          <Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)} disabled={encounter.ended}>{t('Adicionar participante')}</Button>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
          <Button component={Link} to="/combat-sim">{t('Encontros')}</Button><Button startIcon={<Download />} onClick={() => downloadJSON(encounter.name, exportEncounter(encounter))}>{t('Exportar encontro')}</Button><Button startIcon={<UploadFile />} onClick={() => setImporting(true)}>{t('Importar encontro')}</Button><Button onClick={() => notify(t('O encontro já está salvo automaticamente a cada alteração.'))}>{t('Salvar')}</Button><Button startIcon={<AccessTime />} onClick={() => setClocks(true)}>{t('Relógios')} ({encounter.clocks.length})</Button><Button color="secondary" onClick={end}>{t(encounter.ended ? 'Reabrir encontro' : 'Encerrar combate')}</Button>
        </Stack>
      </Paper>
      {error && <Alert severity="error" onClose={() => setError('')} role="alert">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <TextField type="number" size="small" label={t('Rodada')} value={encounter.round} inputProps={{ min: 1, max: 99999 }} onChange={e => { const value = Number(e.target.value); if (Number.isInteger(value) && value >= 1 && value <= 99999) change(t('Ajustar rodada'), c => { c.round = value; }); }} sx={{ width: 110 }} />
          <TextField select size="small" label={t('Vencedor da iniciativa')} value={encounter.firstSide} onChange={e => change(t('Ajustar iniciativa'), c => { c.firstSide = e.target.value; c.activeSide = e.target.value; })} sx={{ minWidth: 200 }}><MenuItem value="heroes">{t('Heróis')}</MenuItem><MenuItem value="foes">{t('Adversários')}</MenuItem></TextField>
          <TextField select size="small" label={t('Lado ativo (mestre)')} value={encounter.activeSide} onChange={e => change(t('Ajustar lado ativo'), c => { c.activeSide = e.target.value; })} sx={{ minWidth: 200 }}><MenuItem value="heroes">{t('Heróis')}</MenuItem><MenuItem value="foes">{t('Adversários')}</MenuItem></TextField>
          <Button variant="outlined" disabled={encounter.ended} onClick={() => { if (remaining > 0 && !window.confirm(t('Ainda há turnos disponíveis. Avançar a rodada por decisão do mestre?'))) return; change(t('Próxima rodada'), nextRound); }}>{t('Próxima rodada')}</Button>
        </Stack>
        <Typography variant="body2" sx={{ mt: 1 }}>{t('Os lados alternam turnos. Escolha quem age dentro do lado ativo. A próxima rodada limpa apenas os turnos realizados.')}</Typography>
      </Paper>
      {targetIds.length > 0 && <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}><Stack direction="row" gap={1} flexWrap="wrap" alignItems="center"><Typography fontWeight="bold">{targetIds.length} {t('alvos selecionados')}</Typography><TextField select size="small" label={t('Recurso')} value={resource} onChange={e => setResource(e.target.value)} sx={{ minWidth: 130 }}>{[...new Set(encounter.participants.filter(p => targetIds.includes(p.id)).flatMap(p => Object.keys(p.resources)))].map(key => <MenuItem key={key} value={key}>{t(RESOURCE_LABELS[key] || key)}</MenuItem>)}</TextField><TextField select size="small" label={t('Operação')} value={operation} onChange={e => setOperation(e.target.value)} sx={{ minWidth: 160 }}><MenuItem value="subtract">{t('Subtrair (−)')}</MenuItem><MenuItem value="add">{t('Somar (+)')}</MenuItem><MenuItem value="set">{t('Definir (=)')}</MenuItem></TextField><TextField size="small" type="number" label={t('Valor')} value={amount} onChange={e => setAmount(e.target.value)} inputProps={{ min: 0 }} sx={{ width: 100 }} /><Button variant="contained" onClick={() => apply(targetIds, resource, operation, amount)}>{t('Aplicar a todos os alvos')}</Button><Button onClick={() => setSelected([])}>{t('Limpar seleção')}</Button></Stack><Typography variant="caption">{t('Dano representa perda final de PV. Resolva afinidades, Guarda e modificadores antes de aplicar.')}</Typography></Paper>}
      {!encounter.participants.length && <Paper variant="outlined" sx={{ textAlign: 'center', py: 5, px: 2 }}><Typography variant="h4" gutterBottom>{t('Prepare a batalha')}</Typography><Typography sx={{ mb: 2 }}>{t('Adicione um personagem real da biblioteca ou importe seu JSON. Depois, acrescente os adversários e suas cópias.')}</Typography><Button variant="contained" startIcon={<Add />} onClick={() => setAdding(true)}>{t('Adicionar participante')}</Button></Paper>}
      {targetIds.length > 0 && <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center"><TextField select size="small" label={t('Condição para os alvos')} value={condition} onChange={e => setCondition(e.target.value)} sx={{ minWidth: 180 }}>{Object.entries(CONDITIONS).map(([key, label]) => <MenuItem key={key} value={key}>{t(label)}</MenuItem>)}</TextField><Button onClick={() => bulkCondition(true)}>{t('Adicionar condição')}</Button><Button onClick={() => bulkCondition(false)}>{t('Remover condição')}</Button><Typography variant="caption">{t('Imunidades da ficha são respeitadas ao adicionar condições.')}</Typography></Stack>}
      <Grid container spacing={2} sx={{ width: '100%' }}>
        {['heroes', 'foes'].map(side => <Grid item xs={12} lg={6} key={side}><Paper variant="outlined" sx={{ p: 1.5, bgcolor: side === encounter.activeSide ? 'action.hover' : 'background.paper' }}><Stack direction="row" gap={1} alignItems="center" sx={{ mb: 2 }}><Typography variant="h4" component="h2">{t(side === 'heroes' ? 'Heróis' : 'Adversários')}</Typography>{encounter.activeSide === side && <Chip label={t('Lado ativo')} color="primary" />}</Stack><Grid container spacing={2}>{encounter.participants.filter(p => p.side === side).map(p => <Grid item xs={12} sm={6} lg={12} xl={6} key={p.id}><ParticipantCard participant={p} activeSide={encounter.activeSide} selected={targetIds.includes(p.id)} onSelect={() => setSelected(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} onOperation={(key, op, value) => apply([p.id], key, op, value)} onChange={patch => patchParticipant(p, patch)} onDetail={() => setDetail(p.id)} onAct={() => change(`${t('Turno realizado')}: ${p.label}`, e => markTurn(e, p.id))} /></Grid>)}</Grid></Paper></Grid>)}
      </Grid>
      <Accordion><AccordionSummary expandIcon={<ExpandMore />}>{t('Notas do encontro')}</AccordionSummary><AccordionDetails><TextField multiline fullWidth minRows={4} label={t('Notas gerais')} value={encounter.notes} onChange={e => change(t('Editar notas'), c => { c.notes = e.target.value; })} /></AccordionDetails></Accordion>
      <Accordion><AccordionSummary expandIcon={<ExpandMore />}>{t('Histórico e desfazer')} ({encounter.history.length})</AccordionSummary><AccordionDetails><Button startIcon={<Undo />} disabled={!encounter.history.length} onClick={() => { try { undoEncounter(id); notify(t('Última alteração desfeita.')); } catch (error) { setError(error.message); } }}>{t('Desfazer última alteração')}</Button>{[...encounter.history].reverse().map(entry => <Typography key={entry.id} variant="body2" sx={{ my: 1 }}>{new Date(entry.at).toLocaleTimeString()} · {entry.label}</Typography>)}</AccordionDetails></Accordion>
      <Typography variant="caption">{t('Efeitos e condições são temporários do encontro. Recursos de personagens vinculados permanecem na biblioteca, inclusive ao remover participantes ou encerrar o combate.')}</Typography>
    </Stack>
    {adding && <ParticipantPicker open encounterId={id} onClose={() => setAdding(false)} />}
    {importing && <EncounterImport onClose={() => setImporting(false)} />}
    {p && <ParticipantDetails key={p.id} participant={p} onClose={() => setDetail(null)} onChange={patch => patchParticipant(p, patch)} onNotify={notify} onSave={() => setSavingParticipant(p)} onRemove={() => { change(`${t('Remover participante')}: ${p.label}`, e => { e.participants = e.participants.filter(item => item.id !== p.id); }); setDetail(null); }} />}
    {savingParticipant && <ParticipantPicker open libraryOnly initialCandidates={[{ kind: savingParticipant.kind, sheet: exportSheet(savingParticipant) }]} onClose={() => setSavingParticipant(null)} />}
    <CombatSimClocks open={clocks} onClose={() => setClocks(false)} clocks={encounter.clocks} onSave={clock => change(t('Adicionar relógio'), e => { e.clocks.push(clock); })} onUpdate={(index, state) => change(t('Atualizar relógio'), e => { e.clocks[index].state = state; })} onRemove={index => change(t('Remover relógio'), e => { e.clocks.splice(index, 1); })} onReset={index => change(t('Reiniciar relógio'), e => { e.clocks[index].state.fill(false); })} addLog={() => {}} />
    <Snackbar open={Boolean(message)} autoHideDuration={2400} onClose={() => setMessage('')} message={message} />
  </Box></Layout>;
}
