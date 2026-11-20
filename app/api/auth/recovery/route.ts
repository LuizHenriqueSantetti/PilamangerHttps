import { env } from "../../../../src/server/runtime";
import { assertSameOrigin, hashPassword, isStrongPassword, json, safeTextEqual } from '../../../../src/server/auth';

// Disabled unless the hosting owner provisions a short-lived, account-scoped grant.
// The old updated_at value acts as a compare-and-swap: a grant cannot be reused.
type RecoveryGrant = { userId: string; expectedUpdatedAt: string; tokenHash: string; expiresAt: string };
type RecoveryEnv = typeof env & { OWNER_RECOVERY_GRANT?: string };

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const unavailable = () => json({ error: 'Recuperação indisponível.' }, { status: 404 });
  let grant: RecoveryGrant;
  try { grant = JSON.parse((env as RecoveryEnv).OWNER_RECOVERY_GRANT || 'null'); }
  catch { return unavailable(); }
  const expires = Date.parse(grant?.expiresAt || '');
  if (!grant?.userId || !grant.expectedUpdatedAt || !/^[a-f0-9]{64}$/.test(grant.tokenHash || '')
    || !Number.isFinite(expires) || expires <= Date.now() || expires > Date.now() + 30 * 60_000) return unavailable();
  const payload = await request.json().catch(() => null) as { token?: unknown; newPassword?: unknown } | null;
  const token = typeof payload?.token === 'string' ? payload.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) return unavailable();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  const suppliedHash = Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
  if (!safeTextEqual(suppliedHash, grant.tokenHash)) return unavailable();
  const password = typeof payload?.newPassword === 'string' ? payload.newPassword : '';
  if (!isStrongPassword(password)) return json({ error: 'A nova senha não atende aos requisitos de segurança.' }, { status: 400 });
  const now = new Date().toISOString();
  if (now === grant.expectedUpdatedAt) return unavailable();
  const hash = await hashPassword(password);
  // Database batch is transactional. Every side effect requires the successful CAS timestamp.
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ?
      WHERE id = ? AND updated_at = ? AND active = 1 AND role = 'gerencia'`)
      .bind(hash, now, grant.userId, grant.expectedUpdatedAt),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ? AND EXISTS
      (SELECT 1 FROM users WHERE id = ? AND updated_at = ?)`)
      .bind(grant.userId, grant.userId, now),
    env.DB.prepare(`DELETE FROM login_attempts WHERE email IN
      (SELECT email FROM users WHERE id = ? AND updated_at = ?)`)
      .bind(grant.userId, now),
    env.DB.prepare(`INSERT INTO audit_logs (id, user_id, action, module, record_id, created_at)
      SELECT ?, id, 'Acesso recuperado pelo titular da hospedagem', 'Segurança', id, ?
      FROM users WHERE id = ? AND updated_at = ?`)
      .bind(crypto.randomUUID(), now, grant.userId, now),
  ]);
  if (results[0].meta.changes !== 1) return unavailable();
  return json({ ok: true });
}
