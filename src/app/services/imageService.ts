const INPUT_LIMIT = 10 * 1024 * 1024;
const OUTPUT_LIMIT = 512_000;

export function validateImageFile(file: File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if (!file.size || file.size > INPUT_LIMIT) throw new Error('Escolha uma imagem de até 10 MB.');
}

/** Decode and resize locally; only the bounded raster result is sent to the server. */
export async function prepareImage(file: File): Promise<string> {
  validateImageFile(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error('Não foi possível abrir esta imagem. Tente outro arquivo.'); });
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem neste navegador.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const result = canvas.toDataURL('image/webp',0.85);
    if (result.length > 650_000) throw new Error('Esta imagem é muito detalhada. Escolha uma imagem menor.');
    return result;
  } finally { URL.revokeObjectURL(url); }
}

export async function persistImage(value: string, kind: 'profile' | 'studio'): Promise<string> {
  if (!value.startsWith('data:image/')) return value;
  const blob = await (await fetch(value)).blob();
  if (blob.size > OUTPUT_LIMIT) throw new Error('A imagem é muito grande. Escolha novamente para redimensionar.');
  const response = await fetch(`/api/images?kind=${kind}`, { method:'POST', credentials:'same-origin', headers:{'Content-Type':blob.type}, body:blob });
  const result = await response.json() as {url?: string; error?: string};
  if (!response.ok || !result.url) throw new Error(result.error || 'Não foi possível salvar a imagem. Tente novamente.');
  return result.url;
}
