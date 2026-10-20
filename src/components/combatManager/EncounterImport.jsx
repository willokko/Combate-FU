import React, { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { parseEncounter } from '../../data/encounters.js';
import { transaction } from '../../data/localStore.js';
import { t } from '../../translation/translate';

export default function EncounterImport({ onClose }) {
  const [text, setText] = useState(''), [preview, setPreview] = useState(null), [error, setError] = useState('');
  const navigate = useNavigate();
  const validate = value => { try { setPreview(parseEncounter(value)); setError(''); } catch (e) { setPreview(null); setError(e.message); } };
  return <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{t('Importar encontro completo')}</DialogTitle>
    <DialogContent><Stack spacing={2}>
      <Alert severity="info">{t('O encontro será importado como uma cópia. As fichas incluídas ficam independentes para não alterar sua biblioteca por engano.')}</Alert>
      <Button component="label">{t('Selecionar arquivo JSON')}<input hidden type="file" accept=".json,application/json" onChange={async e => { const file = e.target.files[0]; if (!file) return; try { if (file.size > 20 * 1024 * 1024) throw new Error(t('O arquivo excede 20 MB.')); const value = await file.text(); setText(value); validate(value); } catch (error) { setError(error.message); } }} /></Button>
      <TextField multiline minRows={4} maxRows={8} label={t('Cole aqui o JSON completo')} value={text} onChange={e => { setText(e.target.value); setPreview(null); }} />
      <Button onClick={() => validate(text)}>{t('Validar e visualizar')}</Button>
      {error && <Alert severity="error">{error}</Alert>}
      {preview && <Typography>{preview.name} · {t('Rodada')} {preview.round} · {preview.participants.length} {t('participantes')}</Typography>}
    </Stack></DialogContent>
    <DialogActions><Button onClick={onClose}>{t('Cancelar')}</Button><Button variant="contained" disabled={!preview} onClick={() => { try { transaction(db => { db.encounters[preview.id] = preview; }); onClose(); navigate(`/combat-sim/${preview.id}`); } catch (e) { setError(e.message); } }}>{t('Confirmar importação')}</Button></DialogActions>
  </Dialog>;
}
