import { env } from "../../../../src/server/runtime";
import { assertSameOrigin, audit, clearSessionCookie, json, requireSession } from '../../../../src/server/auth';

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const result = await requireSession(request, undefined, true);
  if ('session' in result) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(result.session.tokenHash).run();
    await audit(result.session.user.id, 'Logout realizado', 'Autenticação', result.session.user.email);
  }
  return json({ ok: true }, {
    headers: { 'Set-Cookie': clearSessionCookie(new URL(request.url).protocol === 'https:') },
  });
}
