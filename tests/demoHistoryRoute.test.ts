import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_IMPORT_ID } from '../src/server/demoHistory';

const state = vi.hoisted(() => ({ db: null as any, role: 'gerencia', loggedIn: true, conflict: false, failWrite: false }));
vi.mock("../src/server/runtime", () => ({ env: { get DB() { return state.db; } } }));
vi.mock('../src/server/auth', () => ({
  assertSameOrigin: (request: Request) => request.headers.get('origin') === new URL(request.url).origin,
  json: (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json' } }),
  audit: vi.fn(),
  requireSession: async (_: Request, roles?: string[]) => !state.loggedIn ? { error: new Response('{}', { status: 401 }) } : roles && !roles.includes(state.role) ? { error: new Response('{}', { status: 403 }) } : { session: { user: { id: 'manager', role: state.role } } },
}));
import { GET, POST } from '../app/api/demo-history/route';
import { POST as store } from '../app/api/storage/route';

let sqlite: DatabaseSync;
const request = (body: unknown = { confirm: DEMO_IMPORT_ID, privacyAccepted: true }, origin = 'https://test.example') => new Request('https://test.example/api/demo-history', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const read = (key: string) => JSON.parse((sqlite.prepare('SELECT value FROM app_storage WHERE key = ?').get(key) as { value: string }).value);
const write = (key: string, data: unknown) => sqlite.prepare("INSERT INTO app_storage VALUES (?,?,'now') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, JSON.stringify(data));
function prepare(sql: string) {
  let args: any[] = [];
  const statement = {
    sql,
    bind: (...values: any[]) => { args = values; return statement; },
    first: async () => sqlite.prepare(sql).get(...args) || null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  };
  return statement;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22T15:00:00Z'));
  state.loggedIn = true; state.role = 'gerencia'; state.conflict = false; state.failWrite = false;
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE app_storage(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT); CREATE TABLE demo_import_runs(id TEXT PRIMARY KEY,request_id TEXT UNIQUE,user_id TEXT,created_at TEXT,summary TEXT); CREATE TABLE audit_logs(id TEXT,user_id TEXT,action TEXT,module TEXT,record_id TEXT,metadata TEXT,created_at TEXT)');
  write('pacientes', [{ id: 'previous', nome: 'Preservado', dataCadastro: '2026-09-01' }]);
  write('planos', ['Essencial', 'Equilíbrio', 'Intensivo'].map((nome, i) => ({ id: `plan-${i}`, nome: `DEMO — ${nome}`, preco: [200, 360, 480][i], quantidadeAulas: [4, 8, 12][i], ativo: true })));
  write('profissionais', ['Kaue Cardoso', 'Felipe Donatoni', 'Gabriel Benine'].map((nome, i) => ({ id: `pro-${i}`, nome, status: 'ativo', registroProfissional: 'DEMO-TESTE', tipoComissao: 'percentual', comissaoPercentual: [40, 35, 30][i] })));
  state.db = { prepare, batch: async (statements: ReturnType<typeof prepare>[]) => {
    if (state.conflict) write('pacientes', [...read('pacientes'), { id: 'concurrent', nome: 'Concorrente' }]);
    sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const [index, statement] of statements.entries()) {
        if (state.failWrite && index === 3) throw new Error('simulated database failure');
        results.push(await statement.run());
      }
      sqlite.exec('COMMIT'); return results;
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
});
afterEach(() => { sqlite.close(); vi.useRealTimers(); });

describe('endpoint da exceção única usando SQL transacional', () => {
  it('exige sessão, Gerência, mesma origem e confirmação específica', async () => {
    state.loggedIn = false;
    expect((await POST(request())).status).toBe(401);
    expect((await GET(new Request('https://test.example/api/demo-history'))).status).toBe(401);
    state.loggedIn = true; state.role = 'admin';
    expect((await POST(request())).status).toBe(403);
    state.role = 'gerencia';
    expect((await POST(request(undefined, 'https://other.example'))).status).toBe(403);
    expect((await POST(request({ confirm: DEMO_IMPORT_ID, privacyAccepted: false }))).status).toBe(400);
    expect((await POST(request({ confirm: DEMO_IMPORT_ID, privacyAccepted: true, date: '2020-01-01' }))).status).toBe(400);
    expect(read('pacientes')).toHaveLength(1);
  });
  it('grava tudo uma vez, audita e bloqueia repetição inclusive com registros removidos', async () => {
    expect((await POST(request())).status).toBe(200);
    expect(read('pacientes')).toHaveLength(9);
    expect(read('pagamentos')).toHaveLength(8);
    expect(read('agendamentos')).toHaveLength(8);
    expect(read('detalheAulasPagamento')).toHaveLength(5);
    expect(sqlite.prepare('SELECT * FROM audit_logs').all()).toHaveLength(1);
    expect((await POST(request())).status).toBe(409);
    write('pacientes', []);
    expect((await POST(request())).status).toBe(409);
    const response = await GET(new Request('https://test.example/api/demo-history'));
    expect(await response.json()).toMatchObject({ used: true, summary: { clients: 8, received: 1600 } });
  });
  it('recusa execução expirada e conflito sem importação parcial', async () => {
    vi.setSystemTime(new Date('2026-10-23T03:00:00Z'));
    expect((await POST(request())).status).toBe(410);
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'));
    state.conflict = true;
    expect((await POST(request())).status).toBe(409);
    expect(read('pacientes')).toHaveLength(2);
    expect(sqlite.prepare('SELECT * FROM demo_import_runs').all()).toHaveLength(0);
    expect(sqlite.prepare("SELECT * FROM app_storage WHERE key='pagamentos'").all()).toHaveLength(0);
  });
  it('rollback remove recibo e escritas se uma etapa falhar', async () => {
    state.failWrite = true;
    expect((await POST(request())).status).toBe(500);
    expect(read('pacientes')).toHaveLength(1);
    expect(sqlite.prepare('SELECT * FROM demo_import_runs').all()).toHaveLength(0);
    state.failWrite = false;
    expect((await POST(request())).status).toBe(200);
  });
  it('cadastro comum rejeita datas passadas mesmo depois da importação', async () => {
    await POST(request());
    const storage = (entries: Record<string, string>) => new Request('https://test.example/api/storage', { method: 'POST', headers: { Origin: 'https://test.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ entries }) });
    const historical = read('agendamentos');
    expect((await store(storage({ agendamentos: JSON.stringify([...historical, { id: 'bypass', date: '2026-10-21' }]) }))).status).toBe(400);
    expect((await store(storage({ agendamentos: JSON.stringify([...historical, { id: 'today', date: '2026-10-22' }, { id: 'future', date: '2026-10-29' }]) }))).status).toBe(200);
    expect((await store(storage({ pacientes: JSON.stringify([...read('pacientes'), { id: 'old-client', dataCadastro: '2026-10-21' }]) }))).status).toBe(400);
    expect((await store(storage({ pagamentos: JSON.stringify([...read('pagamentos'), { id: 'old-payment', vencimento: '2026-10-21', status: 'pendente' }]) }))).status).toBe(400);
  });
});
