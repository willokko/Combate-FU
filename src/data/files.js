import JSZip from 'jszip';
import { parseSheets } from './sheets.js';
export function downloadJSON(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${name.replace(/[<>:"/\\|?*]/g, '_')}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readSheetFiles(files) {
  const candidates = [];
  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) throw new Error('O arquivo excede 20 MB. Divida a coleção.');
    if (file.name.toLowerCase().endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      let total = 0;
      for (const entry of Object.values(zip.files)) if (!entry.dir && entry.name.toLowerCase().endsWith('.json')) {
        const text = await entry.async('string'); total += text.length;
        if (total > 20 * 1024 * 1024 || candidates.length >= 500) throw new Error('O ZIP excede o limite de 20 MB ou 500 fichas.');
        candidates.push(...parseSheets(text));
      }
    } else candidates.push(...parseSheets(await file.text()));
  }
  if (!candidates.length || candidates.length > 500) throw new Error('Selecione entre 1 e 500 fichas JSON. O ZIP deve conter arquivos JSON.');
  return candidates;
}
