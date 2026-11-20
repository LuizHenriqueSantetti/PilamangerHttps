export const MAX_IMAGE_BYTES = 512_000;

export function rasterImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if ([137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start,end));
  if (ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP') return 'image/webp';
  return null;
}

export function managedImageKey(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith('/api/images?key=')) return null;
  try {
    const parsed = new URL(url, 'https://local.invalid');
    const key = parsed.searchParams.get('key') || '';
    return /^(profile\/[a-zA-Z0-9-]{1,100}|studio)\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key) ? key : null;
  } catch { return null; }
}

/** Keep bounded legacy raster avatars working while rejecting scripts and oversized input. */
export function validLegacyAvatar(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 500_000) return false;
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return false;
  try { return rasterImageType(Uint8Array.from(atob(match[2]), char => char.charCodeAt(0))) === match[1]; }
  catch { return false; }
}
