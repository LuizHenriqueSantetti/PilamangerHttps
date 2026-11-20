import { env } from "../../../src/server/runtime";
import { assertSameOrigin, audit, hashPassword, isStrongPassword, json, normalizeEmail, requireSession, sanitizeText, type UserRole } from '../../../src/server/auth';
import { managedImageKey, validLegacyAvatar } from '../../../src/server/images';

const ROLES: UserRole[] = ['gerencia', 'admin', 'fisio', 'recepcao'];

async function management(request: Request) {
  return requireSession(request, ['gerencia', 'admin']);
}

function publicUser(row: Record<string, string | number | null>) {
  return {
    id: row.id, email: row.email, name: row.name, role: row.role,
    telefone: row.phone ?? undefined, foto: row.avatar ?? undefined,
    ativo: Boolean(row.active), mustChangePassword: Boolean(row.must_change_password),
    privacyAcceptedAt: row.privacy_accepted_at ?? undefined,
    privacyPolicyVersion: row.privacy_policy_version ?? undefined,
  };
}

export async function GET(request: Request) {
  const auth = await management(request);
  if ('error' in auth) return auth.error;
  const result = await env.DB.prepare('SELECT id, email, name, role, phone, avatar, active, must_change_password, privacy_accepted_at, privacy_policy_version FROM users ORDER BY name').all<Record<string, string | number | null>>();
  return json({ users: (result.results ?? []).map(publicUser) });
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const auth = await management(request);
  if ('error' in auth) return auth.error;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = sanitizeText(body?.name);
  const email = normalizeEmail(body?.email);
  const role = String(body?.role ?? '') as UserRole;
  const password = String(body?.password ?? '');
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !ROLES.includes(role)) return json({ error: 'Dados do usuário inválidos.' }, { status: 400 });
  if (auth.session.user.role !== 'gerencia' && role === 'gerencia') return json({ error: 'Somente a Gerência pode criar outro usuário de Gerência.' }, { status: 403 });
  if (!isStrongPassword(password)) return json({ error: 'A senha precisa ter ao menos 10 caracteres, maiúscula, minúscula, número e símbolo.' }, { status: 400 });
  const exists = await env.DB.prepare('SELECT 1 AS found FROM users WHERE email = ?').bind(email).first();
  if (exists) return json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 });
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO users (id, email, name, role, password_hash, active, must_change_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)')
    .bind(id, email, name, role, await hashPassword(password), now, now).run();
  await audit(auth.session.user.id, 'Usuário criado', 'Usuários', id, { email, role });
  const row = await env.DB.prepare('SELECT id, email, name, role, phone, avatar, active, must_change_password, privacy_accepted_at, privacy_policy_version FROM users WHERE id = ?').bind(id).first<Record<string, string | number | null>>();
  return json({ user: publicUser(row!) }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const sessionAuth = await requireSession(request);
  if ('error' in sessionAuth) return sessionAuth.error;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const originalEmail = normalizeEmail(body?.originalEmail ?? sessionAuth.session.user.email);
  const target = await env.DB.prepare('SELECT id, email, role, active, phone, avatar FROM users WHERE email = ?').bind(originalEmail).first<Record<string, string | number | null>>();
  if (!target) return json({ error: 'Usuário não encontrado.' }, { status: 404 });
  const self = String(target.id) === sessionAuth.session.user.id;
  const manager = ['gerencia', 'admin'].includes(sessionAuth.session.user.role);
  if (!self && !manager) return json({ error: 'Você não possui permissão para alterar este usuário.' }, { status: 403 });
  if (target.role === 'gerencia' && sessionAuth.session.user.role !== 'gerencia' && !self) return json({ error: 'Somente a Gerência pode alterar esse usuário.' }, { status: 403 });

  const name = sanitizeText(body?.name ?? sessionAuth.session.user.name);
  const email = normalizeEmail(body?.email ?? originalEmail);
  const role = String(body?.role ?? target.role) as UserRole;
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !ROLES.includes(role)) return json({ error: 'Dados do usuário inválidos.' }, { status: 400 });
  if ((!manager || sessionAuth.session.user.role !== 'gerencia') && role !== target.role) return json({ error: 'Você não pode alterar este perfil de acesso.' }, { status: 403 });
  const active = manager && !self ? body?.ativo !== false : Boolean(target.active);
  if (target.role === 'gerencia' && (role !== 'gerencia' || !active)) {
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'gerencia' AND active = 1 AND id <> ?")
      .bind(target.id).first<{ total: number }>();
    if (Number(count?.total ?? 0) < 1) return json({ error: 'O sistema precisa manter ao menos um usuário de Gerência ativo.' }, { status: 400 });
  }
  const phone = body?.telefone === undefined ? target.phone : sanitizeText(body.telefone, 32) || null;
  let avatar = target.avatar;
  if (body && Object.prototype.hasOwnProperty.call(body, 'foto')) {
    if (body.foto === '' || body.foto === null) avatar = null;
    else {
      const key = managedImageKey(body.foto);
      if (key) {
        if (!key.startsWith(`profile/${target.id}/`) || !await env.BUCKET?.head(key)) return json({ error: 'A foto não foi salva. Escolha a imagem novamente.' }, { status: 400 });
      } else if (!validLegacyAvatar(body.foto)) return json({ error: 'Foto inválida ou muito grande. Escolha novamente para ajustar a imagem.' }, { status: 400 });
      avatar = String(body.foto);
    }
  }
  const duplicate = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id <> ?').bind(email, target.id).first();
  if (duplicate) return json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 });
  const statements = [env.DB.prepare('UPDATE users SET email = ?, name = ?, role = ?, phone = ?, avatar = ?, active = ?, updated_at = ? WHERE id = ?')
    .bind(email, name, role, phone, avatar, active ? 1 : 0, new Date().toISOString(), target.id)];
  const password = String(body?.password ?? '');
  if (password) {
    if (!manager || !isStrongPassword(password)) return json({ error: 'A nova senha não atende aos requisitos de segurança.' }, { status: 400 });
    statements.push(env.DB.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').bind(await hashPassword(password), target.id));
    statements.push(env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id));
  }
  await env.DB.batch(statements);
  await audit(sessionAuth.session.user.id, 'Usuário atualizado', 'Usuários', String(target.id), { email, role, active });
  const row = await env.DB.prepare('SELECT id, email, name, role, phone, avatar, active, must_change_password, privacy_accepted_at, privacy_policy_version FROM users WHERE id = ?').bind(target.id).first<Record<string, string | number | null>>();
  return json({ user: publicUser(row!) });
}

export async function DELETE(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const auth = await management(request);
  if ('error' in auth) return auth.error;
  const email = normalizeEmail(new URL(request.url).searchParams.get('email'));
  const target = await env.DB.prepare('SELECT id, role FROM users WHERE email = ?').bind(email).first<{ id: string; role: UserRole }>();
  if (!target) return json({ error: 'Usuário não encontrado.' }, { status: 404 });
  if (target.id === auth.session.user.id) return json({ error: 'Você não pode excluir sua própria conta.' }, { status: 400 });
  if (target.role === 'gerencia' && auth.session.user.role !== 'gerencia') return json({ error: 'Somente a Gerência pode excluir esse usuário.' }, { status: 403 });
  if (target.role === 'gerencia') {
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'gerencia' AND active = 1").first<{ total: number }>();
    if (Number(count?.total ?? 0) <= 1) return json({ error: 'O sistema precisa manter ao menos um usuário de Gerência ativo.' }, { status: 400 });
  }
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(target.id).run();
  await audit(auth.session.user.id, 'Usuário excluído', 'Usuários', target.id, { email });
  return json({ ok: true });
}
