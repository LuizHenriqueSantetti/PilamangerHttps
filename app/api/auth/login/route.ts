import { env } from "../../../../src/server/runtime";
import { assertSameOrigin, audit, createSession, json, normalizeEmail, verifyPassword } from '../../../../src/server/auth';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const payload = await request.json().catch(() => null) as { email?: unknown; password?: unknown; remember?: unknown } | null;
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password ?? '');
  if (!email || !password || password.length > 128) return json({ error: 'E-mail ou senha inválidos.' }, { status: 400 });

  const attempt = await env.DB.prepare('SELECT failures, locked_until FROM login_attempts WHERE email = ?').bind(email).first<{ failures: number; locked_until: string | null }>();
  const now = new Date();
  if (attempt?.locked_until && new Date(attempt.locked_until) > now) {
    return json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
  }

  const user = await env.DB.prepare('SELECT id, email, name, role, password_hash, active, must_change_password, phone, avatar, privacy_accepted_at, privacy_policy_version FROM users WHERE email = ?')
    .bind(email).first<Record<string, string | number | null>>();
  const valid = Boolean(user?.active) && Boolean(user?.password_hash) && await verifyPassword(password, String(user?.password_hash ?? ''));
  if (!valid || !user) {
    const failures = (attempt?.locked_until ? 0 : Number(attempt?.failures ?? 0)) + 1;
    const lockedUntil = failures >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() : null;
    await env.DB.prepare(`INSERT INTO login_attempts (email, failures, locked_until, last_attempt_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until, last_attempt_at = excluded.last_attempt_at`)
      .bind(email, failures, lockedUntil, now.toISOString()).run();
    await audit(null, lockedUntil ? 'Login bloqueado' : 'Login recusado', 'Autenticação', email);
    return json({ error: lockedUntil ? 'Muitas tentativas inválidas. Login bloqueado por 15 minutos.' : 'E-mail ou senha incorretos.', remaining: Math.max(MAX_FAILURES - failures, 0) }, { status: 401 });
  }

  await env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(email).run();
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now.toISOString()).run();
  const session = await createSession(
    String(user.id),
    Boolean(payload?.remember),
    new URL(request.url).protocol === 'https:',
  );
  await audit(String(user.id), 'Login realizado', 'Autenticação', email);
  return json({
    user: {
      id: user.id, email: user.email, name: user.name, role: user.role,
      telefone: user.phone ?? undefined, foto: user.avatar ?? undefined,
      ativo: Boolean(user.active), mustChangePassword: Boolean(user.must_change_password),
      privacyAcceptedAt: user.privacy_accepted_at ?? undefined,
      privacyPolicyVersion: user.privacy_policy_version ?? undefined,
    },
  }, { headers: { 'Set-Cookie': session.cookie } });
}
