CREATE TABLE IF NOT EXISTS app_storage(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(
 id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('gerencia','admin','fisio','recepcao')),
 password_hash TEXT NOT NULL,phone TEXT,avatar TEXT,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 must_change_password INTEGER NOT NULL DEFAULT 1 CHECK(must_change_password IN (0,1)),
 privacy_accepted_at TEXT,privacy_policy_version TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,last_seen_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts(email TEXT PRIMARY KEY,failures INTEGER NOT NULL DEFAULT 0,locked_until TEXT,last_attempt_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE SET NULL,action TEXT NOT NULL,module TEXT NOT NULL,record_id TEXT,metadata TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS demo_import_runs(id TEXT PRIMARY KEY,request_id TEXT UNIQUE NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,summary TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS file_objects(key TEXT PRIMARY KEY,body BYTEA NOT NULL,content_type TEXT NOT NULL,metadata JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
