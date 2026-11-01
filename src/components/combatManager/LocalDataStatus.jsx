import React from 'react';
import { Alert, Button } from '@mui/material';
import { useStorageError } from '../../data/hooks.js';
import { STORE_KEY } from '../../data/localStore.js';
import { downloadJSON } from '../../data/files.js';
import { t } from '../../translation/translate';
import { CloudAccount } from '../cloud/CloudSession.jsx';
export default function LocalDataStatus() {
  const error = useStorageError();
  return <>
    <CloudAccount hideControls />
    {error && <Alert sx={{ mb: 2, mx: 1 }} severity="error" role="alert" action={<Button onClick={() => { try { downloadJSON('fultimator-recuperacao', { storageKey: STORE_KEY, raw: localStorage.getItem(STORE_KEY) }); } catch { /* Browser blocks storage entirely; keep the diagnostic visible. */ } }}>{t('Exportar dados para recuperação')}</Button>}>{error}</Alert>}
  </>;
}
