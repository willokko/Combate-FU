import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Grid, IconButton, Tooltip } from '@mui/material';
import { ContentCopy, Share, Download, Report } from '@mui/icons-material';
import NpcPretty from '../../components/npc/Pretty';
import Export from '../../components/Export';
import useDownloadImage from '../../hooks/useDownloadImage';
import { useTranslate } from '../../translation/translate';

class SheetBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Alert severity="warning">{this.props.fallback}</Alert> : this.props.children; }
}

// Upstream sheet renderer and action row, rather than a second card design.
export default function CompendiumNpc({ npc, expanded, onCopy, onShare, onReport }) {
  const { t } = useTranslate(), ref = useRef();
  const [open, setOpen] = useState(expanded);
  const [downloadImage] = useDownloadImage(npc.name, ref);
  useEffect(() => setOpen(expanded), [expanded]);
  return <Grid item xs={12} md={12} sx={{ marginBottom: 3 }} component="article" aria-label={npc.name}>
    <SheetBoundary fallback={t('Compendium.displayError')}>
      <Box role="button" tabIndex={0} aria-label={`${t(open ? 'Collapse' : 'Expand')} ${npc.name}`} aria-expanded={open}
        onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setOpen(value => !value); } }}>
        <NpcPretty npc={npc} ref={ref} npcImage="" collapse={open} onClick={() => setOpen(value => !value)} />
      </Box>
    </SheetBoundary>
    <Tooltip title={t('Copy to adversary designer')}><IconButton aria-label={t('Copy to adversary designer')} onClick={onCopy}><ContentCopy /></IconButton></Tooltip>
    <Tooltip title={t('Share URL')}><IconButton aria-label={t('Share URL')} onClick={onShare}><Share /></IconButton></Tooltip>
    <Tooltip title={t('Download as Image')}><IconButton aria-label={t('Download as Image')} onClick={downloadImage}><Download /></IconButton></Tooltip>
    <Tooltip title={t('Report NPC')}><IconButton aria-label={t('Report NPC')} onClick={onReport}><Report /></IconButton></Tooltip>
    <Export name={npc.name} dataType="npc" data={npc} />
    <span style={{ fontSize: 14 }}>{t('Created By:')} {npc.createdBy}</span>
  </Grid>;
}
