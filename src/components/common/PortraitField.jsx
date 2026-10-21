import React, { useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { AddPhotoAlternate } from '@mui/icons-material';
import { useTranslate } from '../../translation/translate';
import { PORTRAIT_TYPES, readPortraitFile } from '../../data/portraits.js';

export default function PortraitField({ value: suppliedValue, onChange }) {
  const value = typeof suppliedValue === 'string' ? suppliedValue : '';
  const { t } = useTranslate();
  const [draft, setDraft] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const input = useRef(null);
  useEffect(() => { setDraft(value.startsWith('data:') ? '' : value); }, [value]);

  const chooseFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const portrait = await readPortraitFile(file);
      onChange(portrait);
      setMessage(t('Portrait.selected'));
    } catch (error) { setError(t(error.message)); }
    finally { setBusy(false); }
  };
  const applyLink = async () => {
    setError(''); setMessage('');
    let url;
    try { url = new URL(draft.trim()); }
    catch { setError(t('Portrait.invalidLink')); return; }
    if (!['https:', 'http:'].includes(url.protocol)) { setError(t('Portrait.invalidLink')); return; }
    setBusy(true);
    try {
      // Checking via <img> also works for image hosts without fetch/CORS access.
      await new Promise((resolve, reject) => {
        const image = new Image();
        const timeout = setTimeout(() => { image.onload = null; image.onerror = null; image.src = ''; reject(new Error('Portrait.linkError')); }, 15000);
        image.onload = () => { clearTimeout(timeout); resolve(); };
        image.onerror = () => { clearTimeout(timeout); reject(new Error('Portrait.linkError')); };
        image.src = url.href;
      });
      onChange(url.href); setMessage(t('Portrait.selected'));
    } catch (error) { setError(t(error.message)); }
    finally { setBusy(false); }
  };
  return <Stack spacing={1.5}>
    <Stack direction="row" spacing={2} alignItems="center">
      {value && <Avatar variant="rounded" src={value} alt={t('Portrait.preview')} sx={{ width: 80, height: 80, '& img': { objectFit: 'contain' } }} />}
      <Stack spacing={1} flex={1}>
        <Button variant="contained" startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <AddPhotoAlternate />} disabled={busy} onClick={() => input.current?.click()} sx={{ minHeight: 44 }}>{t(busy ? 'Portrait.processing' : 'Portrait.chooseFile')}</Button>
        <Typography variant="caption">{t('Portrait.help')}</Typography>
      </Stack>
      <input ref={input} hidden type="file" accept={PORTRAIT_TYPES.join(',')} aria-label={t('Portrait.chooseFile')} onChange={chooseFile} />
    </Stack>
    <TextField fullWidth label={t('Image URL') + ':'} value={draft} onChange={event => { setDraft(event.target.value); setError(''); setMessage(''); }} disabled={busy} helperText={t(value.startsWith('data:') ? 'Portrait.embedded' : 'Portrait.linkAlternative')} />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
      <Button variant="outlined" disabled={busy || !draft.trim()} onClick={applyLink} sx={{ minHeight: 44 }}>{t('Update Image')}</Button>
      <Button variant="outlined" disabled={busy || !value} onClick={() => { onChange(''); setDraft(''); setError(''); setMessage(t('Portrait.removed')); }} sx={{ minHeight: 44 }}>{t('Remove Image')}</Button>
    </Stack>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {message && <Typography variant="body2" role="status">{message}</Typography>}
    <Typography variant="caption">{t('Please ensure to credit the artist in the description or notes section.')}</Typography>
  </Stack>;
}
