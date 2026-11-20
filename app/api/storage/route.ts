import { env } from "../../../src/server/runtime";
import { assertSameOrigin, audit, json, requireSession, type UserRole } from '../../../src/server/auth';
import { studioDate, validateOperationalDates } from '../../../src/server/operationalDates';

type StoragePayload = { entries?: Record<string, unknown>; removals?: unknown[] };

const RESERVED_KEYS = new Set(['users', 'currentUser', 'savedLoginAccounts', 'loginAttempts', 'isManagerAuthenticated']);
const FINANCIAL_KEY = /(finance|pagamento|comiss|receita|despesa|transa[cç]|faturamento|detalheAulasPagamento)/i;
const MANAGEMENT_KEY = /(cargo|permiss|systemLogs|audit|accessLog|academiaData|dangerousActions)/i;
const PROFESSIONAL_ALLOWED = /(paciente|agendamento|agenda|plano|alert|notifica|prefer|idioma|accessibility|animation|favoriteColor|profission)/i;
const RECEPTION_ALLOWED = /(paciente|agendamento|agenda|plano|pagamento|alert|notifica|prefer|idioma|accessibility|animation|favoriteColor|profission)/i;

function allowed(role: UserRole, key: string) {
  if (!key || key.length > 120 || key.startsWith('__pilamanager_') || RESERVED_KEYS.has(key)) return false;
  if (role === 'gerencia') return true;
  if (role === 'admin') return !/password|token|secret/i.test(key);
  if (/comiss|detalheAulasPagamento/i.test(key)) return false;
  if (MANAGEMENT_KEY.test(key) || FINANCIAL_KEY.test(key)) return role === 'recepcao' && RECEPTION_ALLOWED.test(key);
  return role === 'fisio' ? PROFESSIONAL_ALLOWED.test(key) : RECEPTION_ALLOWED.test(key);
}

function normalizeValue(value: unknown) {
  if (typeof value !== 'string' || value.length > 2_000_000) return null;
  try { JSON.parse(value); } catch { return null; }
  return value;
}

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;
  const result = await env.DB.prepare('SELECT key, value, updated_at FROM app_storage ORDER BY key').all<{ key: string; value: string; updated_at: string }>();
  const rows = (result.results ?? []).filter(row => allowed(auth.session.user.role, row.key));
  return json({
    entries: Object.fromEntries(rows.map(row => [row.key, row.value])),
    updatedAt: Object.fromEntries(rows.map(row => [row.key, row.updated_at])),
  });
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;
  if (Number(request.headers.get('content-length') ?? 0) > 4_000_000) return json({ error: 'Solicitação muito grande.' }, { status: 413 });
  const payload = await request.json().catch(() => null) as StoragePayload | null;
  if (!payload || (payload.entries && typeof payload.entries !== 'object') || (payload.removals && !Array.isArray(payload.removals))) return json({ error: 'Dados inválidos.' }, { status: 400 });
  const now = new Date().toISOString();
  const statements: ReturnType<typeof env.DB.prepare>[] = [];
  const changedKeys: string[] = [];
  for (const [key, rawValue] of Object.entries(payload.entries ?? {})) {
    if (key === 'detalheAulasPagamento') return json({ error: 'Use a operação de comissionamento.' }, { status: 403 });
    if (!allowed(auth.session.user.role, key)) return json({ error: `Sem permissão para alterar ${key}.` }, { status: 403 });
    const value = normalizeValue(rawValue);
    if (value === null) return json({ error: `Valor inválido para ${key}.` }, { status: 400 });
    if (['pacientes', 'agendamentos', 'pagamentos'].includes(key)) {
      const stored = await env.DB.prepare('SELECT value FROM app_storage WHERE key = ?').bind(key).first<{value: string}>();
      const previous = JSON.parse(stored?.value || '[]'), next = JSON.parse(value);
      if (!Array.isArray(previous) || !Array.isArray(next) || next.some(item => !item || typeof item !== 'object')) return json({ error: 'Registros inválidos.' }, { status: 400 });
      if (new Set(next.map(item => String(item.id))).size !== next.length) return json({ error: 'Registros duplicados.' }, { status: 400 });
      const error = validateOperationalDates(key, previous, next, studioDate());
      if (error) return json({ error }, { status: 400 });
    }
    if (key === 'pagamentos') {
      const next = JSON.parse(value);
      const stored = await env.DB.prepare('SELECT value FROM app_storage WHERE key = ?').bind(key).first<{value: string}>();
      const previous = JSON.parse(stored?.value || '[]');
      if (!Array.isArray(next) || !Array.isArray(previous)) return json({ error: 'Cobranças inválidas.' }, { status: 400 });
      const settled = (p: any) => ['pago', 'recebido'].includes(p.status);
      const changedReceipt = previous.filter(settled).some((p: any) => !next.some((n: any) => n.id === p.id && JSON.stringify(n) === JSON.stringify(p)));
      const newReceipt = next.filter(settled).some((p: any) => !previous.some((n: any) => n.id === p.id && settled(n)));
      if (changedReceipt || newReceipt) return json({ error: 'Use a operação de recebimento. Recebimentos não podem ser sobrescritos.' }, { status: 403 });
    }
    statements.push(env.DB.prepare('INSERT INTO app_storage (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(key, value, now));
    changedKeys.push(key);
  }
  for (const rawKey of payload.removals ?? []) {
    const key = String(rawKey ?? '');
    if (key === 'detalheAulasPagamento') return json({ error: 'O histórico de comissões não pode ser removido.' }, { status: 403 });
    if (key === 'pagamentos') {
      const stored = await env.DB.prepare('SELECT value FROM app_storage WHERE key = ?').bind(key).first<{value: string}>();
      if (JSON.parse(stored?.value || '[]').some((p: any) => ['pago', 'recebido'].includes(p.status))) return json({ error: 'O histórico de recebimentos não pode ser removido.' }, { status: 403 });
    }
    if (!allowed(auth.session.user.role, key)) return json({ error: `Sem permissão para remover ${key}.` }, { status: 403 });
    statements.push(env.DB.prepare('DELETE FROM app_storage WHERE key = ?').bind(key));
    changedKeys.push(key);
  }
  if (statements.length > 100) return json({ error: 'Muitas alterações em uma única solicitação.' }, { status: 400 });
  if (statements.length) await env.DB.batch(statements);
  await audit(auth.session.user.id, 'Dados atualizados', 'Persistência', undefined, { keys: changedKeys.slice(0, 100) });
  return json({ ok: true, updated: statements.length });
}
