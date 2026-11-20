import { env } from "../../../../src/server/runtime";
import { assertSameOrigin, audit, hashPassword, isStrongPassword, json, requireSession, verifyPassword } from '../../../../src/server/auth';

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const auth = await requireSession(request, undefined, true);
  if ('error' in auth) return auth.error;
  const payload = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null;
  const currentPassword = String(payload?.currentPassword ?? '');
  const newPassword = String(payload?.newPassword ?? '');
  if (!isStrongPassword(newPassword)) return json({ error: 'A nova senha não atende aos requisitos de segurança.' }, { status: 400 });
  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(auth.session.user.id).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) return json({ error: 'Senha atual incorreta.' }, { status: 400 });
  const passwordHash = await hashPassword(newPassword);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?').bind(passwordHash, new Date().toISOString(), auth.session.user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').bind(auth.session.user.id, auth.session.tokenHash),
  ]);
  await audit(auth.session.user.id, 'Senha alterada', 'Segurança', auth.session.user.email);
  return json({ ok: true });
}
