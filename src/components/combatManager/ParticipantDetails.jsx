import React, { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Drawer, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Close, ExpandMore } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import PlayerCardSheet from '../player/playerSheet/compact/PlayerSheetCompact.jsx';
import GenericRolls from '../player/playerSheet/GenericRolls.jsx';
import NpcPretty from '../npc/Pretty.jsx';
import RollsTab from '../combatSim/npcDetail/RollsTab.jsx';
import StandardRollsSection from '../combatSim/npcDetail/StandardRollsSection.jsx';
import { applyResources, CONDITIONS, exportSheet, RESOURCE_LABELS } from '../../data/sheets.js';
import { downloadJSON } from '../../data/files.js';
import { random } from '../../libs/rolls.js';
import { calcDamage, calcMagic, calcPrecision } from '../../libs/npcs.js';
import { remoteEnabled } from '../../firebase.js';
import { t } from '../../translation/translate';

export default function ParticipantDetails({ participant: p, onClose, onChange, onRemove, onSave, onNotify }) {
  const [roll, setRoll] = useState('');
  const sheet = applyResources(p.sheet, p.resources);
  const statuses = { ...sheet.statuses };
  for (const key of Object.keys(CONDITIONS)) statuses[key] = p.conditions.includes(key);
  const player = { ...sheet, statuses };
  const attr = key => {
    const penalties = { dexterity: ['slow', 'enraged'], insight: ['dazed', 'enraged'], might: ['weak', 'poisoned'], will: ['shaken', 'poisoned'] };
    const boost = { dexterity: 'dexUp', insight: 'insUp', might: 'migUp', will: 'wlpUp' }[key];
    return Math.max(6, Math.min(12, Number(sheet.attributes[key]) - (penalties[key] || []).filter(c => p.conditions.includes(c)).length * 2 + (p.conditions.includes(boost) ? 2 : 0)));
  };
  const rollAttack = (attack, magic = false) => {
    const source = attack.weapon || attack;
    const a = source.att1 || source.attr1, b = source.att2 || source.attr2;
    if (!a || !b) { onNotify(t('Este efeito não possui um teste definido. Resolva manualmente.')); return; }
    const dice = [random(`d${attr(a)}`), random(`d${attr(b)}`)];
    const bonus = magic ? calcMagic(sheet) : calcPrecision(attack, sheet);
    setRoll(`${source.name || attack.name}: ${dice.join(' + ')} + ${bonus} = ${dice[0] + dice[1] + bonus}${magic ? '' : ` · ${t('Dano')}: ${Math.max(...dice) + calcDamage(attack, sheet)}`} · ${dice.every(d => d === 1) ? t('Falha crítica') : dice[0] === dice[1] && dice[0] >= 6 ? t('Sucesso crítico') : t('Resultado do teste')}`);
  };
  return <Drawer anchor="right" open onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: 680 }, maxWidth: '100vw' } }}>
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="h5">{p.label}</Typography><IconButton onClick={onClose} aria-label={t('Fechar ficha')}><Close /></IconButton></Stack>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ my: 2 }}>
        <Button onClick={() => downloadJSON(p.label, exportSheet(p))}>{t('Exportar ficha atualizada')}</Button>
        {!p.link && <Button onClick={onSave}>{t('Salvar na biblioteca')}</Button>}
        {p.link && <Button onClick={() => onChange({ link: null })}>{t('Usar cópia independente')}</Button>}
        {p.link && !remoteEnabled && <Button component={Link} to={`/pc-gallery/${p.link.key}`} state={{ from: location.hash.slice(1) }}>{t('Abrir editor completo')}</Button>}
      </Stack>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography fontWeight="bold">{Object.entries(p.resources).map(([key, stat]) => `${t(RESOURCE_LABELS[key] || key)} ${stat.current}/${stat.max}`).join(' · ')}</Typography>
        <TextField label={t('Identificação no encontro')} value={p.label} onChange={e => onChange({ label: e.target.value })} />
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><TextField select fullWidth label={t('Lado')} value={p.side} onChange={e => onChange({ side: e.target.value })}><MenuItem value="heroes">{t('Heróis')}</MenuItem><MenuItem value="foes">{t('Adversários')}</MenuItem></TextField>
          <TextField label={t('Turnos por rodada (mestre)')} type="number" inputProps={{ min: 1, max: 20 }} value={p.turns} onChange={e => { const value = Number(e.target.value); if (Number.isInteger(value) && value >= 1 && value <= 20) onChange({ turns: value, acted: Math.min(p.acted, value) }); }} />
          <TextField label={t('Turnos já realizados')} type="number" inputProps={{ min: 0, max: p.turns }} value={p.acted} onChange={e => { const value = Number(e.target.value); if (Number.isInteger(value) && value >= 0 && value <= p.turns) onChange({ acted: value }); }} />
        </Stack>
        <TextField label={t('Efeitos temporários e duração')} multiline minRows={2} value={p.effects} onChange={e => onChange({ effects: e.target.value })} />
        <TextField label={t('Notas temporárias')} multiline minRows={2} value={p.notes} onChange={e => onChange({ notes: e.target.value })} />
      </Stack>
      <Alert severity="info" sx={{ mb: 2 }}>{t('Rolagens consultam a ficha e as condições. Custos, dano e efeitos de habilidades são aplicados pelos controles manuais.')}</Alert>
      {p.kind === 'pc' ? <>
        <GenericRolls player={player} />
        <PlayerCardSheet player={player} isCharacterSheet isEditMode={false} setPlayer={() => onNotify(t('Use os controles de recursos e efeitos do encontro para registrar a alteração.'))} />
      </> : <>
        {roll && <Alert sx={{ my: 1 }} role="status">{roll}</Alert>}
        <StandardRollsSection selectedNPC={sheet} calcAttr={(_a, _b, key) => attr(key)} handleRoll={(a, b, labelA, labelB) => { const results = [random(`d${a}`), random(`d${b}`)]; setRoll(`${labelA} + ${labelB}: ${results.join(' + ')} = ${results[0] + results[1]}`); }} />
        <RollsTab manualMode selectedNPC={{ ...sheet, combatStats: { currentHp: p.resources.hp.current, currentMp: p.resources.mp.current } }} handleAttack={attack => rollAttack(attack)} handleSpell={spell => spell.type === 'offensive' ? rollAttack(spell, true) : onNotify(t('Consulte o efeito da magia na ficha e aplique-o manualmente.'))} setClickedData={() => {}} setOpen={() => onNotify(t('Consulte o efeito da magia na ficha e aplique-o manualmente.'))} />
        <NpcPretty npc={sheet} collapse />
      </>}
      <Accordion sx={{ my: 2 }}><AccordionSummary expandIcon={<ExpandMore />}>{t('Todos os dados originais (JSON)')}</AccordionSummary><AccordionDetails><Box component="pre" sx={{ overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{JSON.stringify(exportSheet(p), null, 2)}</Box></AccordionDetails></Accordion>
      <Button color="error" onClick={onRemove}>{t('Remover do encontro')}</Button>
    </Box>
  </Drawer>;
}
