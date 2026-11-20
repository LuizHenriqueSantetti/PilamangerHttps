import { env } from "../../../src/server/runtime";
import { assertSameOrigin, audit, json, requireSession } from '../../../src/server/auth';

const POLICY_VERSION = '2026-09-23';

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE users SET privacy_accepted_at = ?, privacy_policy_version = ?, updated_at = ? WHERE id = ?')
    .bind(now, POLICY_VERSION, now, auth.session.user.id).run();
  await audit(auth.session.user.id, 'Política de privacidade aceita', 'LGPD', auth.session.user.id, { version: POLICY_VERSION });
  return json({ privacyAcceptedAt: now, privacyPolicyVersion: POLICY_VERSION });
}
