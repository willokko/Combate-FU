import React from 'react';
import { Avatar, Button, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Slider, TextField, useMediaQuery } from '@mui/material';
import { Search } from '@mui/icons-material';
import { languageOptions, useTranslate } from '../../translation/translate';
import allToken from '../icons/All-token.webp';
import beastToken from '../icons/Beast-token.webp';
import constructToken from '../icons/Construct-token.webp';
import demonToken from '../icons/Demon-token.webp';
import elementalToken from '../icons/Elemental-token.webp';
import humanToken from '../icons/Human-token.webp';
import monsterToken from '../icons/Monster-token.webp';
import plantToken from '../icons/Plant-token.webp';
import undeadToken from '../icons/Undead-token.webp';

const species = [
  [allToken, 'All'], [beastToken, 'Beast'], [constructToken, 'Construct'],
  [demonToken, 'Demon'], [elementalToken, 'Elemental'], [humanToken, 'Humanoid'],
  [monsterToken, 'Monster'], [plantToken, 'Plant'], [undeadToken, 'Undead'],
];
const ranks = [
  ['soldier', 'Soldier'], ['elite', 'Elite'],
  ...Array.from({ length: 6 }, (_, i) => [`champion${i + 1}`, `Champion(${i + 1})`]),
  ['companion', 'Companion'], ['groupvehicle', 'Group Vehicle'],
];

// Same assets, dimensions, spacing and controls as the upstream compendium.
export default function CompendiumFilters({ value, onChange, expanded, onToggleExpanded, onSearch }) {
  const { t } = useTranslate(), isMobile = useMediaQuery('(max-width:899.95px)');
  const change = (key, next) => onChange({ ...value, [key]: next });
  return <Paper elevation={3} sx={{ marginBottom: 5, padding: 4 }} component="form" onSubmit={event => { event.preventDefault(); onSearch(); }}>
    <Grid container spacing={1} sx={{ py: 1 }} justifyContent="center">
      {species.map(([token, name]) => {
        const selected = (value.species || 'All') === name;
        const size = selected ? (isMobile ? 80 : 130) : (isMobile ? 60 : 100);
        return <Grid item xs={4} md={1.3} key={name} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Avatar component="button" type="button" alt={t(name)} src={token} aria-label={t(name)} aria-pressed={selected}
            sx={{ width: size, height: size, border: selected ? '6px solid purple' : 'none', cursor: 'pointer', p: 0, '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 3 } }}
            onClick={() => change('species', name === 'All' ? '' : name)} />
          <div style={{ color: selected ? 'purple' : '#999999', fontWeight: selected ? 700 : 400 }}>{t(name)}</div>
        </Grid>;
      })}
    </Grid>
    <Grid container spacing={1} sx={{ py: 0 }} justifyContent="center">
      <Grid item xs={12} md={3} lg={4} alignItems="center" justifyContent="center" sx={{ display: 'flex' }}>
        <TextField label={t('Adversary Name')} variant="outlined" size="small" fullWidth value={value.search} onChange={event => change('search', event.target.value)} />
      </Grid>
      <Grid item xs={12} md={3} alignItems="center" justifyContent="center" sx={{ display: 'flex', marginLeft: 5, marginRight: 5 }}>
        <Slider getAriaLabel={index => t(index === 0 ? 'Compendium.minLevel' : 'Compendium.maxLevel')} value={value.levels}
          step={5} min={5} max={60} marks={[10, 20, 30, 40, 50, 60].map(level => ({ value: level, label: t(`Lvl ${level}`) }))}
          onChange={(_, next) => change('levels', next)} sx={{ width: 300 }} valueLabelDisplay="auto" getAriaValueText={level => `${t('Lvl:')}${level}`} />
      </Grid>
      <Grid item xs={6} md={2} alignItems="center" justifyContent="center" sx={{ display: 'flex' }}>
        <FormControl fullWidth size="small"><InputLabel id="compendium-rank">{t('Rank:')}</InputLabel><Select labelId="compendium-rank" value={value.rank} label={t('Rank:')} onChange={event => change('rank', event.target.value)}>
          <MenuItem value="">{t('All')}</MenuItem>{ranks.map(([rank, label]) => <MenuItem key={rank} value={rank}>{t(label)}</MenuItem>)}
        </Select></FormControl>
      </Grid>
      <Grid item xs={6} md={2} alignItems="center" sx={{ display: 'flex' }}>
        <FormControl fullWidth size="small"><InputLabel id="compendium-language">{t('Language:')}</InputLabel><Select labelId="compendium-language" value={value.language} label={t('Language:')} onChange={event => change('language', event.target.value)}>
          {languageOptions.filter(option => ['en', 'pt-BR'].includes(option.code)).map(option => <MenuItem key={option.code} value={option.code}>{option.label}</MenuItem>)}
        </Select></FormControl>
      </Grid>
      <Grid item xs={6} md={2} alignItems="center" sx={{ display: 'flex' }}><Button variant="outlined" fullWidth onClick={onToggleExpanded}>{t(expanded ? 'Collapse' : 'Expand')}</Button></Grid>
      <Grid item xs={6} md={2} alignItems="center" justifyContent="center"><Button fullWidth variant="contained" startIcon={<Search />} type="submit">{t('Search')}</Button></Grid>
    </Grid>
  </Paper>;
}
