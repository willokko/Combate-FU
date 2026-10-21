export const PORTRAIT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const PORTRAIT_MAX_BYTES = 64 * 1024;
export const PORTRAIT_MAX_EDGE = 512;
export const PORTRAIT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validatePortraitFile(file) {
  if (!file || !PORTRAIT_TYPES.includes(file.type)) throw new Error('Escolha uma imagem PNG, JPG, WebP ou GIF.');
  if (!file.size) throw new Error('O arquivo está vazio. Escolha outra imagem.');
  if (file.size > PORTRAIT_MAX_FILE_BYTES) throw new Error('A imagem deve ter no máximo 10 MB. Escolha um arquivo menor.');
}

export function portraitDimensions(width, height, maxEdge = PORTRAIT_MAX_EDGE) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width * height > 40000000) {
    throw new Error('A imagem tem dimensões inválidas ou excede 40 megapixels. Escolha uma imagem menor.');
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function dataImageBytes(dataUrl) {
  const data = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor(data.length * 3 / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
}

// Embed a bounded portrait in the original imgurl field. Blob URLs are used only
// while decoding, never persisted or exported.
export async function readPortraitFile(file) {
  validatePortraitFile(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Não foi possível abrir essa imagem. O arquivo pode estar danificado.'));
      image.src = url;
    });
    let dimensions = portraitDimensions(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Seu navegador não conseguiu preparar a imagem. Tente outro navegador.');
    while (true) {
      canvas.width = dimensions.width; canvas.height = dimensions.height;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.45]) {
        let result = canvas.toDataURL('image/webp', quality);
        if (!result.startsWith('data:image/webp;')) {
          // JPEG fallback for browsers without a WebP encoder.
          context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          result = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataImageBytes(result) <= PORTRAIT_MAX_BYTES) return result;
      }
      if (Math.max(dimensions.width, dimensions.height) <= 128) break;
      dimensions = { width: Math.max(1, Math.round(dimensions.width * 0.75)), height: Math.max(1, Math.round(dimensions.height * 0.75)) };
    }
    throw new Error('Não foi possível reduzir a imagem. Escolha um retrato menor ou mais simples.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
