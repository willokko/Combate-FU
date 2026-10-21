import React, { useRef, useState } from 'react';
import { Alert, Button, Card, CardActions, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import ParticipantPicker from '../../components/combatManager/ParticipantPicker.jsx';
import { useLocalDatabase } from '../../data/hooks.js';
import { collectionFor, libraryEntries, RESOURCE_LABELS, resourcesFor } from '../../data/sheets.js';
import { exportBackup, restoreBackup } from '../../data/encounters.js';
import { downloadJSON } from '../../data/files.js';
import { readOfflineLibrary, STORE_KEY, transaction } from '../../data/localStore.js';
import { useCloudSession } from '../../components/cloud/CloudSession.jsx';
import { remoteEnabled } from '../../firebase.js';
import { t } from '../../translation/translate';

export default function LocalLibrary() {
  const db = useLocalDatabase(), restoreRef = useRef();
  const cloud = useCloudSession();
  let conflictKeys = [];
  try { conflictKeys = Object.keys(localStorage).filter(key => key.startsWith(`${STORE_KEY}:conflict:`)); } catch { /* Storage diagnostic is shown by Layout. */ }
  const [search, setSearch] = useState(''), [importing, setImporting] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [backup, setBackup] = useState(null);
  const entries = [...libraryEntries(db, 'pc'), ...libraryEntries(db, 'npc')].filter(entry => entry.sheet.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <Layout><Stack spacing={2}>
    <Typography variant="h3" component="h1">{t('Biblioteca local e backups')}</Typography>
    <Alert severity="info">{cloud.user ? 'Esta biblioteca pertence à sua conta Google neste aplicativo. Acompanhe o estado de sincronização acima. A biblioteca local sem login continua separada e pode ser importada.' : t('As fichas pertencem a esta instalação e navegador. Não há acesso automático à conta do domínio original nem sincronização entre dispositivos.')}</Alert>
    {cloud.user && <Button variant="outlined" onClick={() => { try { setBackup(JSON.stringify(exportBackup(readOfflineLibrary()))); } catch (error) { setError(error.message); } }}>Importar dados locais para esta conta</Button>}
    {conflictKeys.length > 0 && <Stack direction="row" gap={1} flexWrap="wrap">{conflictKeys.map((key, index) => <Button key={key} onClick={() => { try { downloadJSON(`copia-conflito-${index + 1}`, exportBackup(JSON.parse(localStorage.getItem(key)))); } catch (error) { setError(error.message); } }}>Baixar cópia preservada {index + 1}</Button>)}</Stack>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}{message && <Alert onClose={() => setMessage('')}>{message}</Alert>}
    <Stack direction="row" gap={1} flexWrap="wrap"><Button variant="contained" onClick={() => setImporting(true)}>{t('Importar ou colar fichas')}</Button><Button component={Link} to="/pc-gallery">{t('Editor de personagens')}</Button><Button component={Link} to="/npc-gallery">{t('Editor de adversários')}</Button><Button component={Link} to="/combat-sim">{t('Encontros')}</Button></Stack>
    <Stack direction="row" gap={1} flexWrap="wrap"><Button variant="outlined" onClick={() => downloadJSON('fultimator-backup-local', exportBackup(db))}>{t('Baixar backup da biblioteca e encontros')}</Button><Button variant="outlined" onClick={() => restoreRef.current.click()}>{t('Restaurar backup')}</Button><input hidden ref={restoreRef} type="file" accept=".json,application/json" onChange={async e => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; try { if (file.size > 20 * 1024 * 1024) throw new Error(t('O arquivo excede 20 MB.')); const value = await file.text(); JSON.parse(value); setBackup(value); setError(''); } catch { setError(t('Backup inválido ou arquivo muito grande. Nenhum dado foi alterado.')); } }} /></Stack>
    {backup && <Alert severity="warning" action={<Button onClick={() => { try { restoreBackup(backup); setBackup(null); setMessage(t('Backup restaurado. Os dados anteriores foram preservados. Encontros restaurados usam cópias independentes.')); } catch (e) { setError(e.message); } }}>{t('Confirmar restauração')}</Button>}>{t('A restauração mescla as fichas e cria cópias independentes dos encontros, preservando os dados atuais.')}<Button onClick={() => setBackup(null)}>{t('Cancelar')}</Button></Alert>}
    <TextField label={t('Pesquisar por nome')} value={search} onChange={e => setSearch(e.target.value)} />
    {!entries.length && <Typography>{t('Nenhuma ficha encontrada. Crie uma ficha no editor original ou importe um JSON.')}</Typography>}
    <Grid container spacing={2} sx={{ width: '100%' }}>{entries.map(entry => <Grid item xs={12} md={6} key={entry.key}><Card variant="outlined"><CardContent><Typography variant="h5">{entry.sheet.name}</Typography><Typography>{t(entry.kind === 'pc' ? 'Personagem' : 'Adversário')} · {t('Nível')} {entry.sheet.lvl}</Typography><Typography>{Object.entries(resourcesFor(entry.sheet)).map(([key, value]) => `${t(RESOURCE_LABELS[key] || key)} ${value.current}/${value.max}`).join(' · ')}</Typography></CardContent><CardActions sx={{ flexWrap: 'wrap' }}>{!remoteEnabled && <Button component={Link} to={`/${entry.kind === 'pc' ? 'pc' : 'npc'}-gallery/${entry.key}`}>{t('Abrir editor completo')}</Button>}<Button onClick={() => downloadJSON(entry.sheet.name, { ...entry.sheet, dataType: entry.kind })}>{t('Exportar ficha')}</Button><Button color="error" onClick={() => { if (!window.confirm(t('Excluir esta ficha da biblioteca? Participantes existentes serão mantidos como cópias independentes.'))) return; try { transaction(draft => { const collection = collectionFor(entry.kind); delete draft.collections[collection][entry.key]; for (const encounter of Object.values(draft.encounters)) for (const p of encounter.participants) if (p.link?.key === entry.key) p.link = null; }); } catch (e) { setError(e.message); } }}>{t('Excluir')}</Button></CardActions></Card></Grid>)}</Grid>
    {importing && <ParticipantPicker open libraryOnly onClose={() => setImporting(false)} />}
  </Stack></Layout>;
}
