import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const appStorage = sqliteTable('app_storage', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['gerencia', 'admin', 'fisio', 'recepcao'] }).notNull(),
  passwordHash: text('password_hash').notNull(),
  phone: text('phone'),
  avatar: text('avatar'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  privacyAcceptedAt: text('privacy_accepted_at'),
  privacyPolicyVersion: text('privacy_policy_version'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [index('idx_users_role').on(table.role), index('idx_users_active').on(table.active)]);

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
}, table => [index('idx_sessions_user').on(table.userId), index('idx_sessions_expires').on(table.expiresAt)]);

export const loginAttempts = sqliteTable('login_attempts', {
  email: text('email').primaryKey(),
  failures: integer('failures').notNull().default(0),
  lockedUntil: text('locked_until'),
  lastAttemptAt: text('last_attempt_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  module: text('module').notNull(),
  recordId: text('record_id'),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
}, table => [index('idx_audit_created').on(table.createdAt), index('idx_audit_user').on(table.userId)]);

// Immutable receipt: deleting demo records does not re-enable the one-time import.
export const demoImportRuns = sqliteTable('demo_import_runs', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull().unique(),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  summary: text('summary').notNull(),
});
