import { env } from "../../../src/server/runtime";
import { assertSameOrigin, json, requireSession } from '../../../src/server/auth';
import { buildDemoHistory, DEMO_IMPORT_DEADLINE, DEMO_IMPORT_ID, DEMO_KEYS, DEMO_SCENARIOS } from '../../../src/server/demoHistory';

export async function GET(request: Request) {
  const auth = await requireSession(request, ['gerencia']);
  if ('error' in auth) return auth.error;
  const receipt = await env.DB.prepare('SELECT created_at, summary FROM demo_import_runs WHERE id = ?').bind(DEMO_IMPORT_ID).first<{ created_at: string; summary: string }>();
  return json({ used: Boolean(receipt), expired: new Date().toISOString() >= DEMO_IMPORT_DEADLINE, summary: receipt ? JSON.parse(receipt.summary) : null, scenarios: DEMO_SCENARIOS.map(({ nome, birth, joined, due, paid, date, plan }) => ({ nome, birth, joined, due, paid, date, plan })) });
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem inválida.' }, { status: 403 });
  const auth = await requireSession(request, ['gerencia']);
  if ('error' in auth) return auth.error;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || body.confirm !== DEMO_IMPORT_ID || body.privacyAccepted !== true || Object.keys(body).some(key => !['confirm', 'privacyAccepted'].includes(key))) return json({ error: 'Confirme a importação única de demonstração e o aceite de teste.' }, { status: 400 });
  if (new Date().toISOString() >= DEMO_IMPORT_DEADLINE) return json({ error: 'A autorização temporária expirou.' }, { status: 410 });
  if (await env.DB.prepare('SELECT id FROM demo_import_runs WHERE id = ?').bind(DEMO_IMPORT_ID).first()) return json({ error: 'Esta importação já foi utilizada e está bloqueada.' }, { status: 409 });
  const rows = await env.DB.prepare(`SELECT key,value FROM app_storage WHERE key IN (${DEMO_KEYS.map(() => '?').join(',')})`).bind(...DEMO_KEYS).all<{ key: string; value: string }>();
  const raw = Object.fromEntries((rows.results || []).map(row => [row.key, row.value]));
  try {
    const source = Object.fromEntries(DEMO_KEYS.map(key => {
      const value = JSON.parse(raw[key] || '[]');
      if (!Array.isArray(value)) throw new Error('Confira os dados antes de importar.');
      return [key, value];
    }));
    const now = new Date();
    const { collections, summary } = buildDemoHistory(source, auth.session.user.id, now);
    const requestId = crypto.randomUUID();
    const guards = DEMO_KEYS.map(() => "COALESCE((SELECT value FROM app_storage WHERE key = ?), '') = ?").join(' AND ');
    const receipt = env.DB.prepare(`INSERT INTO demo_import_runs (id,request_id,user_id,created_at,summary) SELECT ?,?,?,?,? WHERE ${guards} AND NOT EXISTS (SELECT 1 FROM demo_import_runs WHERE id = ?) ON CONFLICT(id) DO NOTHING`).bind(DEMO_IMPORT_ID, requestId, auth.session.user.id, now.toISOString(), JSON.stringify(summary), ...DEMO_KEYS.flatMap(key => [key, raw[key] || '']), DEMO_IMPORT_ID);
    // D1 batch is one transaction. Every write requires the unique receipt from this request.
    const writes = DEMO_KEYS.filter(key => !['planos', 'profissionais'].includes(key)).map(key => env.DB.prepare('INSERT INTO app_storage (key,value,updated_at) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM demo_import_runs WHERE id = ? AND request_id = ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(key, JSON.stringify(collections[key]), now.toISOString(), DEMO_IMPORT_ID, requestId));
    const audit = env.DB.prepare('INSERT INTO audit_logs (id,user_id,action,module,record_id,metadata,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM demo_import_runs WHERE id = ? AND request_id = ?)').bind(crypto.randomUUID(), auth.session.user.id, 'Importação histórica única de demonstração autorizada', 'Teste', DEMO_IMPORT_ID, JSON.stringify(summary), now.toISOString(), DEMO_IMPORT_ID, requestId);
    const results = await env.DB.batch([receipt, ...writes, audit]);
    if (!results[0].meta.changes) return json({ error: 'Os dados mudaram ou a importação já foi usada. Atualize a página.' }, { status: 409 });
    return json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const safe = /^(Já existe|Confira|A autorização)/.test(message);
    return json({ error: safe ? message : 'Não foi possível importar. Nenhuma alteração parcial foi mantida.' }, { status: safe ? 400 : 500 });
  }
}
