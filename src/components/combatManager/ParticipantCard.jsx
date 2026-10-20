import React, { useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, Checkbox, Chip, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { CheckCircle, Description, Link as LinkIcon } from '@mui/icons-material';
import { CONDITIONS, isCrisis, RESOURCE_LABELS } from '../../data/sheets.js';
import { t } from '../../translation/translate';

export default function ParticipantCard({ participant: p, selected, onSelect, onOperation, onChange, onDetail, onAct, activeSide }) {
  const [amount, setAmount] = useState('5');
  const [resource, setResource] = useState('hp');
  const [operation, setOperation] = useState('set');
  return <Card variant="outlined" component="article" aria-label={p.label} sx={{ height: '100%', borderWidth: 2, borderColor: selected ? 'primary.main' : 'divider', opacity: p.acted >= p.turns ? 0.85 : 1 }}>
    <CardContent>
      <Stack direction="row" gap={1} alignItems="center">
        <Checkbox checked={selected} onChange={onSelect} inputProps={{ 'aria-label': `${t('Selecionar alvo')} ${p.label}` }} />
        <Avatar src={p.kind === 'pc' ? p.sheet.info?.imgurl : p.sheet.imgurl} alt="" />
        <Box flex={1}><Typography variant="h6" component="h3">{p.label}</Typography><Typography variant="body2">{t(p.kind === 'pc' ? 'Personagem' : 'Adversário')} · {t('Nível')} {p.sheet.lvl}</Typography></Box>
      </Stack>
      <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ my: 1 }}>
        <Chip size="small" icon={p.link ? <LinkIcon /> : undefined} label={t(p.link ? 'Vinculado à biblioteca' : 'Cópia independente')} variant="outlined" />
        {isCrisis(p) && <Chip size="small" label={t('Crise')} color="warning" />}
        {p.resources.hp.current === 0 && <Chip size="small" label={t('0 PV — fora de combate')} />}
        <Chip size="small" icon={p.acted >= p.turns ? <CheckCircle /> : undefined} label={`${t(p.acted >= p.turns ? 'Já agiu' : 'Turnos realizados')}: ${p.acted}/${p.turns}`} />
      </Stack>
      <Stack spacing={1}>
        {Object.entries(p.resources).map(([key, stat]) => <Box key={key}>
          <Stack direction="row" justifyContent="space-between"><Typography fontWeight="bold">{t(RESOURCE_LABELS[key] || key)}</Typography><Typography component="output" aria-label={`${p.label} ${RESOURCE_LABELS[key] || key}`}>{stat.current} / {stat.max}</Typography></Stack>
          <LinearProgress variant="determinate" value={stat.max ? Math.min(100, stat.current / stat.max * 100) : 0} color={key === 'hp' ? 'error' : key === 'mp' ? 'info' : 'primary'} aria-label={`${t(RESOURCE_LABELS[key] || key)} ${p.label}`} />
        </Box>)}
      </Stack>
      <TextField size="small" label={t('Valor da operação')} type="number" inputProps={{ min: 0, step: 1, 'aria-label': `${t('Valor da operação')} ${p.label}` }} value={amount} onChange={e => setAmount(e.target.value)} fullWidth sx={{ mt: 2, mb: 1 }} />
      <Stack direction="row" gap={0.5} flexWrap="wrap">
        <Button variant="outlined" color="error" onClick={() => onOperation('hp', 'subtract', amount)}>{t('− PV · Dano')}</Button>
        <Button variant="outlined" onClick={() => onOperation('hp', 'add', amount)}>{t('+ PV · Cura')}</Button>
        <Button variant="outlined" onClick={() => onOperation('mp', 'subtract', amount)}>{t('− PM · Gastar')}</Button>
        <Button variant="outlined" onClick={() => onOperation('mp', 'add', amount)}>{t('+ PM · Recuperar')}</Button>
      </Stack>
      <Stack direction="row" gap={1} sx={{ my: 1.5 }}>
        <TextField select size="small" label={t('Recurso')} value={resource} onChange={e => setResource(e.target.value)} sx={{ flex: 1 }}>{Object.keys(p.resources).map(key => <MenuItem key={key} value={key}>{t(RESOURCE_LABELS[key] || key)}</MenuItem>)}</TextField>
        <TextField select size="small" label={t('Operação')} value={operation} onChange={e => setOperation(e.target.value)} sx={{ flex: 1 }}><MenuItem value="set">{t('Definir (=)')}</MenuItem><MenuItem value="add">{t('Somar (+)')}</MenuItem><MenuItem value="subtract">{t('Subtrair (−)')}</MenuItem></TextField>
        <Button onClick={() => onOperation(resource, operation, amount)}>{t('Aplicar')}</Button>
      </Stack>
      <TextField select size="small" fullWidth label={t('Condições')} SelectProps={{ multiple: true, renderValue: values => values.map(v => t(CONDITIONS[v] || v)).join(', ') }} value={p.conditions} onChange={e => onChange({ conditions: e.target.value })}>
        {[...new Set([...Object.keys(CONDITIONS), ...p.conditions])].map(key => <MenuItem key={key} value={key} disabled={Boolean(p.sheet.immunities?.[key]) && !p.conditions.includes(key)}><Checkbox checked={p.conditions.includes(key)} />{t(CONDITIONS[key] || key)}{p.sheet.immunities?.[key] ? ` (${t('Imune')})` : ''}</MenuItem>)}
      </TextField>
      <Stack direction="row" gap={1} sx={{ mt: 1.5 }}>
        <Button fullWidth variant="contained" disabled={p.acted >= p.turns} onClick={onAct}>{t(activeSide === p.side ? 'Marcar turno realizado' : 'Marcar turno (mestre)')}</Button>
        <Button startIcon={<Description />} onClick={onDetail}>{t('Ficha')}</Button>
      </Stack>
    </CardContent>
  </Card>;
}
