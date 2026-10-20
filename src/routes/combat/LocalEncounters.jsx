import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardActions, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import { Add, Download, UploadFile } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useLocalDatabase } from '../../data/hooks.js';
import { transaction } from '../../data/localStore.js';
import { createEncounter, exportEncounter } from '../../data/encounters.js';
import { downloadJSON } from '../../data/files.js';
import EncounterImport from '../../components/combatManager/EncounterImport.jsx';
import { t } from '../../translation/translate';

export default function LocalEncounters() {
  const db = useLocalDatabase(), navigate = useNavigate();
  const [name, setName] = useState(''), [error, setError] = useState(''), [importing, setImporting] = useState(false);
  const encounters = Object.values(db.encounters).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const create = () => { try { const encounter = createEncounter(name); transaction(draft => { draft.encounters[encounter.id] = encounter; }); navigate(`/combat-sim/${encounter.id}`); } catch (error) { setError(error.message); } };
  return <Layout><Stack spacing={3}>
    <Box><Typography variant="h3" component="h1">{t('Gerenciador de combate')}</Typography><Typography>{t('Personagens e adversários juntos, com suas fichas originais.')}</Typography></Box>
    <Alert severity="info">{t('Encontros e fichas são salvos neste navegador. Exporte backups para guardar os dados ou migrar para outra instalação.')}</Alert>
    {error && <Alert severity="error">{error}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} component="form" onSubmit={e => { e.preventDefault(); create(); }}><TextField label={t('Nome do encontro')} value={name} onChange={e => setName(e.target.value)} inputProps={{ maxLength: 200 }} fullWidth /><Button variant="contained" startIcon={<Add />} type="submit" sx={{ minWidth: 190 }}>{t('Criar encontro')}</Button></Stack>
    <Stack direction="row" gap={1} flexWrap="wrap"><Button startIcon={<UploadFile />} onClick={() => setImporting(true)}>{t('Importar encontro completo')}</Button><Button component={Link} to="/local-library">{t('Biblioteca local e backups')}</Button><Button component={Link} to="/legacy-combat-sim">{t('Simulador original')}</Button></Stack>
    {!encounters.length && <Card variant="outlined"><CardContent><Typography variant="h5">{t('Seu primeiro encontro começa aqui')}</Typography><Typography>{t('Crie um encontro e clique em “Adicionar participante”. Escolha fichas da biblioteca ou importe e cole o JSON exportado pelo Fultimator.')}</Typography></CardContent></Card>}
    <Grid container spacing={2} sx={{ width: '100%' }}>{encounters.map(encounter => <Grid item xs={12} sm={6} md={4} key={encounter.id}><Card variant="outlined"><CardContent><Typography variant="h5">{encounter.name}</Typography><Typography>{t('Rodada')} {encounter.round} · {encounter.participants.length} {t('participantes')} · {t(encounter.ended ? 'Encerrado' : 'Em andamento')}</Typography></CardContent><CardActions sx={{ flexWrap: 'wrap' }}><Button component={Link} to={`/combat-sim/${encounter.id}`}>{t('Abrir encontro')}</Button><Button onClick={() => downloadJSON(encounter.name, exportEncounter(encounter))} startIcon={<Download />}>{t('Exportar')}</Button><Button color="error" onClick={() => { if (window.confirm(t('Excluir este encontro? As fichas e os recursos da biblioteca serão preservados.'))) { try { transaction(draft => { delete draft.encounters[encounter.id]; }); } catch (error) { setError(error.message); } } }}>{t('Excluir')}</Button></CardActions></Card></Grid>)}</Grid>
    {importing && <EncounterImport onClose={() => setImporting(false)} />}
  </Stack></Layout>;
}
