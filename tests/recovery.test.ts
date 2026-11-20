import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const runtime = vi.hoisted(() => ({ env: {} as Record<string, any> }));
vi.mock("../src/server/runtime", () => ({ env: runtime.env }));
import { POST } from '../app/api/auth/recovery/route';
import { verifyPassword } from '../src/server/auth';

const token = 'a'.repeat(64);
const password = 'Recovery!test2026';
const stamp = '2026-01-01T00:00:00.000Z';
let db: DatabaseSync;
function request(body: unknown, origin = 'https://example.test') {
  return new Request('https://example.test/api/auth/recovery', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,role TEXT,active INTEGER,password_hash TEXT,must_change_password INTEGER,updated_at TEXT);
    CREATE TABLE sessions(user_id TEXT); CREATE TABLE login_attempts(email TEXT);
    CREATE TABLE audit_logs(id TEXT,user_id TEXT,action TEXT,module TEXT,record_id TEXT,created_at TEXT);
    INSERT INTO users VALUES('owner','owner@example.test','gerencia',1,'old',0,'${stamp}');
    INSERT INTO sessions VALUES('owner'); INSERT INTO login_attempts VALUES('owner@example.test');`);
  runtime.env.DB = {
    prepare: (sql: string) => ({ bind: (...args: any[]) => ({ sql, args }) }),
    batch: async (statements: { sql: string; args: any[] }[]) => {
      db.exec('BEGIN');
      try {
        const results = statements.map(s => ({ meta: { changes: Number(db.prepare(s.sql).run(...s.args).changes) } }));
        db.exec('COMMIT'); return results;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
  runtime.env.OWNER_RECOVERY_GRANT = JSON.stringify({ userId: 'owner', expectedUpdatedAt: stamp,
    tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600_000).toISOString() });
});
afterEach(() => { db.close(); delete runtime.env.OWNER_RECOVERY_GRANT; });
describe('account-scoped owner recovery', () => {
  it('is disabled without a hosting grant', async () => {
    delete runtime.env.OWNER_RECOVERY_GRANT;
    expect((await POST(request({ token, newPassword: password }))).status).toBe(404);
  });
  it('rejects cross-origin requests', async () => {
    expect((await POST(request({ token, newPassword: password }, 'https://other.test'))).status).toBe(403);
  });
  it('rejects invalid and expired grants without changing the account', async () => {
    expect((await POST(request({ token: 'b'.repeat(64), newPassword: password }))).status).toBe(404);
    const grant = JSON.parse(runtime.env.OWNER_RECOVERY_GRANT); grant.expiresAt = new Date(Date.now() - 1000).toISOString();
    runtime.env.OWNER_RECOVERY_GRANT = JSON.stringify(grant);
    expect((await POST(request({ token, newPassword: password }))).status).toBe(404);
    expect(db.prepare('SELECT password_hash FROM users').get()?.password_hash).toBe('old');
  });
  it('preserves the strong-password requirement', async () => {
    expect((await POST(request({ token, newPassword: '090909' }))).status).toBe(400);
  });
  it('resets only once, hashes the password, invalidates sessions and records an audit', async () => {
    expect((await POST(request({ token, newPassword: password }))).status).toBe(200);
    const hash = String(db.prepare('SELECT password_hash FROM users').get()?.password_hash);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()?.n).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM login_attempts').get()?.n).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM audit_logs').get()?.n).toBe(1);
    expect((await POST(request({ token, newPassword: 'Different!test2026' }))).status).toBe(404);
    expect(db.prepare('SELECT password_hash FROM users').get()?.password_hash).toBe(hash);
  });
  it('cannot reset an inactive or non-management account', async () => {
    db.exec("UPDATE users SET role='recepcao'");
    expect((await POST(request({ token, newPassword: password }))).status).toBe(404);
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()?.n).toBe(1);
    db.exec("UPDATE users SET role='gerencia', active=0");
    expect((await POST(request({ token, newPassword: password }))).status).toBe(404);
  });
});
