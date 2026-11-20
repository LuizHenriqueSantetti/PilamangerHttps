import { getSession, json } from '../../../../src/server/auth';

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) return json({ user: null }, { status: 401 });
  return json({
    user: {
      id: session.user.id, email: session.user.email, name: session.user.name, role: session.user.role,
      telefone: session.user.phone, foto: session.user.avatar, ativo: session.user.active,
      mustChangePassword: session.user.mustChangePassword,
      privacyAcceptedAt: session.user.privacyAcceptedAt,
      privacyPolicyVersion: session.user.privacyPolicyVersion,
    },
  });
}
