import React from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { useStorageError } from '../../data/hooks.js';
import { STORE_KEY } from '../../data/localStore.js';
import { downloadJSON } from '../../data/files.js';
import { remoteEnabled } from '../../firebase.js';
import { t } from '../../translation/translate';
import { CloudAccount } from '../cloud/CloudSession.jsx';
export default function LocalDataStatus() {
  const error = useStorageError();
  return <Box sx={{ mb: 2, mx: 1 }}>
    <CloudAccount />
    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center"><Button component={Link} to="/local-library" size="small">{t(remoteEnabled ? 'Biblioteca local (separada da nuvem)' : 'Biblioteca local e backups')}</Button><Button component={Link} to="/combat-sim" size="small">{t('Gerenciador de combate')}</Button></Stack>
    {error && <Alert severity="error" role="alert" action={<Button onClick={() => { try { downloadJSON('fultimator-recuperacao', { storageKey: STORE_KEY, raw: localStorage.getItem(STORE_KEY) }); } catch { /* Browser blocks storage entirely; keep the diagnostic visible. */ } }}>{t('Exportar dados para recuperação')}</Button>}>{error}</Alert>}
  </Box>;
}
