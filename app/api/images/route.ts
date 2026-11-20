import { env } from "../../../src/server/runtime";
import { assertSameOrigin, audit, json, requireSession } from '../../../src/server/auth';
import { managedImageKey, MAX_IMAGE_BYTES, rasterImageType } from '../../../src/server/images';

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const kind = new URL(request.url).searchParams.get('kind');
  if (kind !== 'profile' && kind !== 'studio') return json({ error: 'Tipo de imagem inválido.' }, { status: 400 });
  const auth = await requireSession(request, kind === 'studio' ? ['gerencia','admin'] : undefined);
  if ('error' in auth) return auth.error;
  if (Number(request.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) return json({ error: 'A imagem é muito grande. Escolha outra imagem.' }, { status: 413 });
  // Bound streamed input too: do not trust Content-Length or read an unlimited body.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Escolha uma imagem.' }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) { await reader.cancel(); return json({ error: 'A imagem é muito grande.' }, { status: 413 }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  const contentType = rasterImageType(bytes);
  if (!contentType || contentType !== request.headers.get('content-type')) return json({ error: 'Use uma imagem JPG, PNG ou WebP válida.' }, { status: 400 });
  if (!env.BUCKET) return json({ error: 'O armazenamento de imagens está indisponível. Tente novamente.' }, { status: 503 });
  const extension = { 'image/png':'png','image/jpeg':'jpg','image/webp':'webp' }[contentType];
  const key = `${kind === 'profile' ? `profile/${auth.session.user.id}` : 'studio'}/${crypto.randomUUID()}.${extension}`;
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType }, customMetadata: { owner: auth.session.user.id } });
  await audit(auth.session.user.id, 'Imagem enviada', kind === 'profile' ? 'Perfil' : 'Clínica');
  return json({ url: `/api/images?key=${encodeURIComponent(key)}` }, { status: 201 });
}

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;
  const url = new URL(request.url);
  const key = managedImageKey(`${url.pathname}${url.search}`);
  if (!key) return json({ error: 'Imagem não encontrada.' }, { status: 404 });
  if (key.startsWith('profile/') && !key.startsWith(`profile/${auth.session.user.id}/`) && !['gerencia','admin'].includes(auth.session.user.role)) return json({ error: 'Acesso não permitido.' }, { status: 403 });
  const object = await env.BUCKET?.get(key);
  if (!object) return json({ error: 'Imagem não encontrada.' }, { status: 404 });
  return new Response(object.body, { headers: {
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox", 'Cross-Origin-Resource-Policy': 'same-origin',
  } });
}
