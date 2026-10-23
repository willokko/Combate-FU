import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Menu, MenuItem, Snackbar, TextField, Typography, useMediaQuery } from '@mui/material';
import { ArrowLeft, ArrowRight } from '@mui/icons-material';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import ParticipantPicker from '../../components/combatManager/ParticipantPicker.jsx';
import { useLocalDatabase } from '../../data/hooks.js';
import { compendium, compendiumShareUrl, searchCompendium } from '../../data/compendium.js';
import { createEncounter } from '../../data/encounters.js';
import { useTranslate } from '../../translation/translate';
import CompendiumFilters from './CompendiumFilters.jsx';
import CompendiumNpc from './CompendiumNpc.jsx';

const PAGE_SIZE = 6;
const initialFilters = { search: '', language: 'pt-BR', species: '', rank: '', levels: [5, 60] };

export default function CommunityCompendium() {
  const { t } = useTranslate(), db = useLocalDatabase(), navigate = useNavigate();
  const [params, setParams] = useSearchParams(), sharedId = params.get('npc');
  const isMobile = useMediaQuery('(max-width:899.95px)');
  const [catalog, setCatalog] = useState(null), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0), [expanded, setExpanded] = useState(true);
  const [filters, setFilters] = useState(initialFilters), [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(0), [loaded, setLoaded] = useState(null);
  const [copyMenu, setCopyMenu] = useState(null), [report, setReport] = useState(null), [manualShare, setManualShare] = useState('');
  const [importing, setImporting] = useState(null), [destination, setDestination] = useState(null), [encounterId, setEncounterId] = useState('new');
  useEffect(() => {
    let current = true;
    compendium.index().then(value => { if (current) setCatalog(value); }).catch(error => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [attempt]);

  const results = useMemo(() => {
    if (sharedId) return (catalog?.entries || []).filter(entry => entry.sourceId === sharedId);
    const restricted = applied.levels[0] !== 5 || applied.levels[1] !== 60;
    return searchCompendium(catalog?.entries || [], {
      ...applied,
      minLevel: restricted ? applied.levels[0] : 1,
      maxLevel: restricted ? applied.levels[1] : 999,
      order: restricted ? 'level' : 'published',
    });
  }, [catalog, applied, sharedId]);
  const visible = useMemo(() => results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [results, page]);
  const pageKey = visible.map(entry => entry.sourceId).join(',');
  useEffect(() => {
    let current = true;
    if (!visible.length) return;
    Promise.all(visible.map(entry => compendium.sheet(entry))).then(candidates => {
      if (current) setLoaded({ key: pageKey, candidates });
    }).catch(error => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [visible, pageKey, attempt]);
  const candidates = loaded?.key === pageKey ? loaded.candidates : null;
  const loading = !catalog || (visible.length > 0 && !candidates);
  const activeEncounters = Object.values(db.encounters).filter(encounter => !encounter.ended).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const search = () => { setError(''); setApplied({ ...filters, levels: [...filters.levels] }); setPage(0); if (sharedId) setParams({}); };
  const combat = candidates => { setDestination(candidates); setEncounterId(activeEncounters[0]?.id || 'new'); setCopyMenu(null); };
  const copy = candidates => { setImporting({ candidates, libraryOnly: true }); setCopyMenu(null); };
  const share = async entry => {
    const url = compendiumShareUrl(window.location.href, entry.sourceId);
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(url); setMessage(t('Copied to Clipboard!'));
    } catch { setManualShare(url); }
  };
  const renderNpc = (candidate, index) => <CompendiumNpc key={visible[index].sourceId} npc={candidate.sheet} expanded={expanded}
    onCopy={event => setCopyMenu({ anchor: event.currentTarget, candidate })}
    onShare={() => share(visible[index])} onReport={() => setReport(visible[index])} />;

  return <Layout>
    <Box component="h1" sx={{ position: 'absolute', width: '1px', height: '1px', m: 0, p: 0, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)' }}>{t('Compendium.title')}</Box>
    <CompendiumFilters value={filters} onChange={setFilters} expanded={expanded} onToggleExpanded={() => setExpanded(value => !value)} onSearch={search} />
    {error && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{error}<Button onClick={() => { setError(''); setAttempt(value => value + 1); }}>{t('Compendium.retry')}</Button></Alert>}
    {sharedId && <Button sx={{ mb: 2 }} onClick={() => { setParams({}); setPage(0); }}>{t('Compendium.back')}</Button>}
    {!loading && candidates && (isMobile ? <div>{candidates.map(renderNpc)}</div> : <div style={{ display: 'flex', flexDirection: 'row-reverse', rowGap: 30 }}>
      <div style={{ marginLeft: 10, width: '50%' }}>{candidates.map((candidate, index) => index % 2 === 0 ? null : renderNpc(candidate, index))}</div>
      <div style={{ marginRight: 10, width: '50%' }}>{candidates.map((candidate, index) => index % 2 !== 0 ? null : renderNpc(candidate, index))}</div>
    </div>)}
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 50 }}>
      {loading && !error ? <CircularProgress aria-label={t('Compendium.loading')} /> : <>
        {page > 0 && <Button variant="contained" sx={{ marginRight: 4 }} startIcon={<ArrowLeft />} onClick={() => { setError(''); setPage(value => value - 1); }} size="large">{t('Prev Items')}</Button>}
        {(page + 1) * PAGE_SIZE < results.length && <Button variant="contained" endIcon={<ArrowRight />} onClick={() => { setError(''); setPage(value => value + 1); }} size="large">{t('Next Items')}</Button>}
        {!results.length && !loading && <Typography fontWeight={700} marginBottom={4}>{t(' No more adversaries found.')}</Typography>}
      </>}
    </div>
    <Menu anchorEl={copyMenu?.anchor || null} open={Boolean(copyMenu)} onClose={() => setCopyMenu(null)}>
      <MenuItem onClick={() => copy([copyMenu.candidate])}>{t('Compendium.copy')}</MenuItem>
      <MenuItem onClick={() => combat([copyMenu.candidate])}>{t('Compendium.addCombat')}</MenuItem>
      <Divider />
      <MenuItem onClick={() => copy(candidates)}>{t('Compendium.copyPage')}</MenuItem>
      <MenuItem onClick={() => combat(candidates)}>{t('Compendium.combatPage')}</MenuItem>
      <Divider />
      <MenuItem component={Link} to="/local-library">{t('Biblioteca local e backups')}</MenuItem>
      <MenuItem component={Link} to="/npc-compedium?source=local">{t('Compendium.myPublished')}</MenuItem>
    </Menu>
    <Dialog open={Boolean(report)} onClose={() => setReport(null)} fullWidth maxWidth="sm"><DialogTitle>{t('Report NPC')}</DialogTitle><DialogContent>
      <Typography sx={{ mb: 2 }}>{t('Compendium.reportSource')}</Typography><Typography>{report?.name}</Typography><Typography>{t('Created By:')} {report?.createdBy}</Typography>
    </DialogContent><DialogActions><Button onClick={() => setReport(null)}>{t('Cancelar')}</Button><Button component="a" href={`https://fultimator.com/npc-gallery/${encodeURIComponent(report?.sourceId || '')}`} target="_blank" rel="noopener noreferrer">{t('Compendium.openSource')}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(manualShare)} onClose={() => setManualShare('')} fullWidth maxWidth="sm"><DialogTitle>{t('Share URL')}</DialogTitle><DialogContent><TextField fullWidth value={manualShare} label={t('Share URL')} margin="normal" InputProps={{ readOnly: true }} onFocus={event => event.target.select()} /></DialogContent><DialogActions><Button onClick={() => setManualShare('')}>{t('Cancelar')}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(destination)} onClose={() => setDestination(null)} fullWidth maxWidth="sm"><DialogTitle>{t('Compendium.chooseEncounter')}</DialogTitle><DialogContent>
      <TextField select fullWidth sx={{ mt: 1 }} label={t('Encontros')} value={encounterId} onChange={event => setEncounterId(event.target.value)}><MenuItem value="new">{t('Criar encontro')}</MenuItem>{activeEncounters.map(encounter => <MenuItem key={encounter.id} value={encounter.id}>{encounter.name} · {t('Rodada')} {encounter.round}</MenuItem>)}</TextField>
    </DialogContent><DialogActions><Button onClick={() => setDestination(null)}>{t('Cancelar')}</Button><Button variant="contained" onClick={() => {
      const fresh = encounterId === 'new' ? createEncounter(t('Compendium.newEncounter')) : null;
      setImporting({ candidates: destination, encounterId: fresh ? undefined : encounterId, newEncounter: fresh, libraryOnly: false }); setDestination(null);
    }}>{t('Compendium.continue')}</Button></DialogActions></Dialog>
    {importing && <ParticipantPicker open initialCandidates={importing.candidates} libraryOnly={importing.libraryOnly} encounterId={importing.encounterId} newEncounter={importing.newEncounter} onClose={saved => {
      const target = importing.encounterId || importing.newEncounter?.id;
      if (saved) { setMessage(t('Compendium.saved')); if (target) navigate(`/combat-sim/${target}`); }
      setImporting(null);
    }} />}
    <Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'right' }} open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage('')} message={message} />
  </Layout>;
}
