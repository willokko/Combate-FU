import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardActions, CardContent, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, Grid, Link as MuiLink, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import NpcPretty from '../../components/npc/Pretty';
import ParticipantPicker from '../../components/combatManager/ParticipantPicker.jsx';
import { useLocalDatabase } from '../../data/hooks.js';
import { compendium, searchCompendium } from '../../data/compendium.js';
import { createEncounter } from '../../data/encounters.js';
import { downloadJSON } from '../../data/files.js';
import { languageOptions, useTranslate } from '../../translation/translate';

const PAGE_SIZE = 12;

// Community content is kept separate from personal records. A malformed display
// field in a third-party sheet must never take the entire compendium down.
class SheetBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Alert severity="warning">{this.props.fallback}</Alert> : this.props.children; }
}

export default function CommunityCompendium() {
  const { t } = useTranslate(), db = useLocalDatabase(), navigate = useNavigate();
  const [catalog, setCatalog] = useState(null), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0), [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({ search: '', language: 'pt-BR', species: '', rank: '', minLevel: '', maxLevel: '' });
  const [page, setPage] = useState(1), [selected, setSelected] = useState([]), [detail, setDetail] = useState(null);
  const [importing, setImporting] = useState(null), [destination, setDestination] = useState(null), [encounterId, setEncounterId] = useState('new');
  useEffect(() => {
    let current = true;
    setError('');
    compendium.index().then(value => { if (current) setCatalog(value); }).catch(error => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [retry]);
  const results = useMemo(() => searchCompendium(catalog?.entries || [], filters), [catalog, filters]);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const visible = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeEncounters = Object.values(db.encounters).filter(encounter => !encounter.ended).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const filter = (key, value) => { setFilters(old => ({ ...old, [key]: value })); setPage(1); };
  const run = async operation => {
    setBusy(true); setError('');
    try { await operation(); } catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  const resolve = async entries => {
    if (!entries.length) throw new Error(t('Compendium.selectFirst'));
    return Promise.all(entries.map(entry => compendium.sheet(entry)));
  };
  const selectedEntries = () => catalog.entries.filter(entry => selected.includes(entry.sourceId));
  const copy = entries => run(async () => setImporting({ candidates: await resolve(entries), libraryOnly: true }));
  const exportEntries = entries => run(async () => {
    const candidates = await resolve(entries);
    downloadJSON(candidates.length === 1 ? candidates[0].sheet.name : 'fultimator-adversarios-selecionados', candidates.length === 1 ? candidates[0].sheet : candidates.map(candidate => candidate.sheet));
  });
  const combat = entries => run(async () => {
    setDestination(await resolve(entries));
    setEncounterId(activeEncounters[0]?.id || 'new');
  });
  const toggle = (entry, checked) => {
    if (checked && selected.length >= 50) { setError(t('Compendium.selectionLimit')); return; }
    setSelected(old => checked ? [...old, entry.sourceId] : old.filter(id => id !== entry.sourceId));
  };
  return <Layout><Stack spacing={2}>
    <Typography variant="h3" component="h1">{t('Compendium.title')}</Typography>
    <Alert severity="info">{t('Compendium.explanation')}</Alert>
    {catalog && <Typography variant="body2">{catalog.entries.length.toLocaleString('pt-BR')} {t('Compendium.ready')} · {t('Compendium.captured')} {new Date(catalog.capturedAt).toLocaleDateString('pt-BR')} · <MuiLink href={catalog.sourceUrl} target="_blank" rel="noopener noreferrer">{t('Compendium.source')}</MuiLink></Typography>}
    {catalog?.excluded.length > 0 && <Typography variant="caption">{catalog.excluded.length} {t('Compendium.invalidOmitted')}</Typography>}
    <Stack direction="row" gap={1} flexWrap="wrap"><Button component={Link} to="/local-library">{t('Biblioteca local e backups')}</Button><Button component={Link} to="/npc-gallery">{t('Editor de adversários')}</Button><Button component={Link} to="/combat-sim">{t('Encontros')}</Button><Button component={Link} to="/npc-compedium?source=local">{t('Compendium.myPublished')}</Button></Stack>
    {error && <Alert severity="error" role="alert" onClose={() => setError('')}>{error}{!catalog && <Button onClick={() => setRetry(value => value + 1)}>{t('Compendium.retry')}</Button>}</Alert>}
    {message && <Alert severity="success" role="status" onClose={() => setMessage('')}>{message}</Alert>}
    {!catalog && !error && <Box role="status" aria-label={t('Compendium.loading')}><CircularProgress /></Box>}
    {catalog && <>
      <Grid container spacing={1} sx={{ width: '100%' }}>
        <Grid item xs={12} md={6}><TextField fullWidth label={t('Compendium.search')} value={filters.search} onChange={event => filter('search', event.target.value)} /></Grid>
        <Grid item xs={12} sm={6} md={3}><TextField select fullWidth label={t('Language:')} value={filters.language} onChange={event => filter('language', event.target.value)}><MenuItem value="">{t('Compendium.allLanguages')}</MenuItem>{languageOptions.filter(option => catalog.languages[option.code]).map(option => <MenuItem key={option.code} value={option.code}>{option.label} ({catalog.languages[option.code]})</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} sm={6} md={3}><TextField select fullWidth label={t('Species:')} value={filters.species} onChange={event => filter('species', event.target.value)}><MenuItem value="">{t('All')}</MenuItem>{[...new Set(catalog.entries.map(entry => entry.species))].sort().map(species => <MenuItem key={species} value={species}>{t(species)}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} sm={6}><TextField select fullWidth label={t('Rank:')} value={filters.rank} onChange={event => filter('rank', event.target.value)}><MenuItem value="">{t('All')}</MenuItem>{[...new Set(catalog.entries.map(entry => entry.rank))].sort().map(rank => <MenuItem key={rank} value={rank}>{t(({ soldier: 'Soldier', elite: 'Elite', companion: 'Companion', groupvehicle: 'Group Vehicle' })[rank] || rank.replace('champion', 'Champion(') + ')')}</MenuItem>)}</TextField></Grid>
        <Grid item xs={6} sm={3}><TextField fullWidth type="number" label={t('Compendium.minLevel')} value={filters.minLevel} inputProps={{ min: 1, max: 999, step: 1 }} onChange={event => filter('minLevel', event.target.value)} /></Grid>
        <Grid item xs={6} sm={3}><TextField fullWidth type="number" label={t('Compendium.maxLevel')} value={filters.maxLevel} inputProps={{ min: 1, max: 999, step: 1 }} onChange={event => filter('maxLevel', event.target.value)} /></Grid>
      </Grid>
      <Stack gap={1} direction="row" flexWrap="wrap" alignItems="center" aria-live="polite"><Typography>{results.length.toLocaleString('pt-BR')} {t('Compendium.results')} · {selected.length} {t('Compendium.selected')}</Typography><Button disabled={!selected.length || busy} variant="contained" onClick={() => copy(selectedEntries())}>{t('Compendium.copySelected')}</Button><Button disabled={!selected.length || busy} variant="outlined" onClick={() => combat(selectedEntries())}>{t('Compendium.addCombat')}</Button><Button disabled={!selected.length || busy} onClick={() => exportEntries(selectedEntries())}>{t('Compendium.exportSelected')}</Button><Button disabled={!selected.length || busy} onClick={() => setSelected([])}>{t('Compendium.clearSelection')}</Button></Stack>
      {busy && <Typography role="status">{t('Compendium.loading')}</Typography>}
      {!results.length && <Alert severity="info">{t('Compendium.noResults')}<Button onClick={() => { setFilters({ search: '', language: '', species: '', rank: '', minLevel: '', maxLevel: '' }); setPage(1); }}>{t('Compendium.clearFilters')}</Button></Alert>}
      <Grid container spacing={2} sx={{ width: '100%' }}>{visible.map(entry => <Grid item xs={12} md={6} lg={4} key={entry.sourceId}><Card variant="outlined" component="article" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1 }}><Stack direction="row" gap={1} alignItems="center"><Checkbox checked={selected.includes(entry.sourceId)} disabled={busy} inputProps={{ 'aria-label': `${t('Selecionar')} ${entry.name}` }} onChange={event => toggle(entry, event.target.checked)} /><Typography variant="h6" component="h2">{entry.name}</Typography></Stack><Typography>{t('Nível')} {entry.lvl} · {t(entry.species)}</Typography><Stack direction="row" gap={1} sx={{ my: 1 }}><Chip size="small" label={`PV ${entry.hp}`} /><Chip size="small" label={`PM ${entry.mp}`} /><Chip size="small" label={entry.language || '—'} /></Stack><Typography variant="body2">{t('Created By:')} {entry.createdBy || t('Compendium.unknownAuthor')}</Typography></CardContent>
        <CardActions sx={{ flexWrap: 'wrap' }}><Button disabled={busy} onClick={() => run(async () => setDetail({ entry, candidate: await compendium.sheet(entry) }))}>{t('Compendium.viewSheet')}</Button><Button disabled={busy} onClick={() => copy([entry])}>{t('Compendium.copy')}</Button><Button disabled={busy} onClick={() => combat([entry])}>{t('Compendium.addCombat')}</Button><Button disabled={busy} onClick={() => exportEntries([entry])}>{t('Exportar ficha')}</Button></CardActions>
      </Card></Grid>)}</Grid>
      <Pagination page={page} count={pageCount} onChange={(_, value) => setPage(value)} size="small" siblingCount={0} sx={{ alignSelf: 'center' }} aria-label={t('Compendium.pages')} />
    </>}
    <Drawer anchor="right" open={Boolean(detail)} onClose={() => setDetail(null)} PaperProps={{ sx: { width: { xs: '100%', md: 760 }, p: 2 } }}><Stack spacing={2}>
      <Button onClick={() => setDetail(null)}>{t('Compendium.closeSheet')}</Button>
      {error && <Alert severity="error">{error}</Alert>}
      {detail && <><Typography variant="h5" component="h2">{detail.entry.name}</Typography><Typography>{t('Created By:')} {detail.entry.createdBy || t('Compendium.unknownAuthor')}</Typography><SheetBoundary key={detail.entry.sourceId} fallback={t('Compendium.displayError')}><NpcPretty npc={detail.candidate.sheet} npcImage={detail.candidate.sheet.imgurl || ''} collapse /></SheetBoundary><Stack direction="row" gap={1} flexWrap="wrap"><Button disabled={busy} variant="contained" onClick={() => copy([detail.entry])}>{t('Compendium.copy')}</Button><Button disabled={busy} onClick={() => combat([detail.entry])}>{t('Compendium.addCombat')}</Button><Button disabled={busy} onClick={() => exportEntries([detail.entry])}>{t('Exportar ficha')}</Button></Stack></>}
    </Stack></Drawer>
    <Dialog open={Boolean(destination)} onClose={() => setDestination(null)} fullWidth maxWidth="sm"><DialogTitle>{t('Compendium.chooseEncounter')}</DialogTitle><DialogContent><TextField select fullWidth sx={{ mt: 1 }} label={t('Encontros')} value={encounterId} onChange={event => setEncounterId(event.target.value)}><MenuItem value="new">{t('Criar encontro')}</MenuItem>{activeEncounters.map(encounter => <MenuItem key={encounter.id} value={encounter.id}>{encounter.name} · {t('Rodada')} {encounter.round}</MenuItem>)}</TextField></DialogContent><DialogActions><Button onClick={() => setDestination(null)}>{t('Cancelar')}</Button><Button variant="contained" onClick={() => {
      const fresh = encounterId === 'new' ? createEncounter(t('Compendium.newEncounter')) : null;
      setImporting({ candidates: destination, encounterId: fresh ? undefined : encounterId, newEncounter: fresh, libraryOnly: false }); setDestination(null);
    }}>{t('Compendium.continue')}</Button></DialogActions></Dialog>
    {importing && <ParticipantPicker open initialCandidates={importing.candidates} libraryOnly={importing.libraryOnly} encounterId={importing.encounterId} newEncounter={importing.newEncounter} onClose={saved => {
      const target = importing.encounterId || importing.newEncounter?.id;
      if (saved) { setMessage(t('Compendium.saved')); if (target) navigate(`/combat-sim/${target}`); }
      setImporting(null);
    }} />}
  </Stack></Layout>;
}
