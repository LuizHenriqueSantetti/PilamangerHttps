import { env } from "../../../src/server/runtime";
import { assertSameOrigin, audit, hashPassword, isStrongPassword, json, normalizeEmail, safeTextEqual, sanitizeText } from '../../../src/server/auth';

type BootstrapEnv = typeof env & { BOOTSTRAP_SECRET?: string };

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const configuredSecret = String((env as BootstrapEnv).BOOTSTRAP_SECRET ?? '');
  if (!configuredSecret) return json({ error: 'Inicialização indisponível.' }, { status: 503 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const suppliedSecret = String(payload?.bootstrapSecret ?? '');
  if (!safeTextEqual(suppliedSecret, configuredSecret)) return json({ error: 'Inicialização indisponível.' }, { status: 404 });

  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM users').first<{ total: number }>();
  if (Number(count?.total ?? 0) > 0) return json({ error: 'A aplicação já foi inicializada.' }, { status: 409 });

  const name = sanitizeText(payload?.name);
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password ?? '');
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !isStrongPassword(password)) {
    return json({ error: 'Dados de inicialização inválidos.' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO users
      (id, email, name, role, password_hash, active, must_change_password, created_at, updated_at)
      VALUES (?, ?, ?, 'gerencia', ?, 1, 1, ?, ?)`)
      .bind(id, email, name, await hashPassword(password), now, now),
    env.DB.prepare(`DELETE FROM app_storage
      WHERE key IN ('users', 'currentUser', 'savedLoginAccounts', 'loginAttempts', 'isManagerAuthenticated', 'rememberSession')`),
  ]);
  await audit(id, 'Aplicação inicializada', 'Segurança', id, { email });
  return json({ ok: true }, { status: 201 });
}
