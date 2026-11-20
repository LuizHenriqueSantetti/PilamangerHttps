import { env } from "./runtime";

export type UserRole = 'gerencia' | 'admin' | 'fisio' | 'recepcao';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  active: boolean;
  mustChangePassword: boolean;
  privacyAcceptedAt?: string;
  privacyPolicyVersion?: string;
}

const SESSION_COOKIE = 'pilamanager_session';
const encoder = new TextEncoder();
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(value: string) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

function safeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
}

export function safeTextEqual(left: string, right: string) {
  return safeEqual(encoder.encode(left), encoder.encode(right));
}

export function normalizeEmail(email: unknown) {
  return String(email ?? '').trim().toLowerCase().slice(0, 254);
}

export function sanitizeText(value: unknown, maxLength = 160) {
  return String(value ?? '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, maxLength);
}

export function isStrongPassword(password: unknown) {
  const value = String(password ?? '');
  return value.length >= 10
    && value.length <= 128
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}

const PBKDF2_STAGE_ITERATIONS = 100_000;
const PBKDF2_STAGES = 4;

async function derivePasswordStage(material: Uint8Array, salt: string, stage: number, iterations: number) {
  const stableMaterial = new Uint8Array(material.byteLength);
  stableMaterial.set(material);
  const key = await crypto.subtle.importKey('raw', stableMaterial, 'PBKDF2', false, ['deriveBits']);
  const stageSalt = encoder.encode(`${salt}:${stage}`);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: stageSalt, iterations }, key, 256));
}

export async function hashPassword(password: string) {
  const salt = randomToken(16);
  let material = encoder.encode(password);
  for (let stage = 0; stage < PBKDF2_STAGES; stage += 1) {
    material = await derivePasswordStage(material, salt, stage, PBKDF2_STAGE_ITERATIONS);
  }
  return `pbkdf2_sha256_chain$${PBKDF2_STAGES}x${PBKDF2_STAGE_ITERATIONS}$${salt}$${bytesToBase64Url(material)}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, rawIterations, salt, expected] = encoded.split('$');
  if (algorithm === 'pbkdf2_sha256_chain') {
    const [rawStages, rawStageIterations] = rawIterations.split('x');
    const stages = Number(rawStages);
    const iterations = Number(rawStageIterations);
    if (!salt || !expected || stages !== PBKDF2_STAGES || iterations !== PBKDF2_STAGE_ITERATIONS) return false;
    let material = encoder.encode(password);
    for (let stage = 0; stage < stages; stage += 1) material = await derivePasswordStage(material, salt, stage, iterations);
    return safeEqual(material, base64UrlToBytes(expected));
  }
  const iterations = Number(rawIterations);
  if (algorithm !== 'pbkdf2_sha256' || !salt || !expected || !Number.isInteger(iterations) || iterations < 100_000) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations }, key, 256);
  return safeEqual(new Uint8Array(bits), base64UrlToBytes(expected));
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get('cookie') ?? '';
  for (const item of cookies.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return decodeURIComponent(parts.join('='));
  }
  return null;
}

export function securityHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'");
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return headers;
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = securityHeaders(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.PUBLIC_ORIGIN || new URL(request.url).origin;
  return Boolean(origin && origin === expected);
}

export async function createSession(userId: string, remember: boolean, secureCookie = true) {
  secureCookie = process.env.NODE_ENV === 'production' || secureCookie;
  const db = env.DB;
  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = new Date();
  const expires = new Date(now.getTime() + (remember ? REMEMBER_DAYS * 86_400_000 : SESSION_HOURS * 3_600_000));
  await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
    .bind(tokenHash, userId, expires.toISOString(), now.toISOString(), now.toISOString()).run();
  return {
    token,
    expires,
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${secureCookie ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${Math.floor((expires.getTime() - now.getTime()) / 1000)}`,
  };
}

export function clearSessionCookie(secureCookie = true) {
  secureCookie = process.env.NODE_ENV === 'production' || secureCookie;
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; ${secureCookie ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0`;
}

export async function getSession(request: Request): Promise<{ user: SessionUser; tokenHash: string } | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const row = await env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.phone, u.avatar, u.active,
      u.must_change_password, u.privacy_accepted_at, u.privacy_policy_version
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
  `).bind(tokenHash, now).first<Record<string, string | number | null>>();
  if (!row) return null;
  await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').bind(now, tokenHash).run();
  return {
    tokenHash,
    user: {
      id: String(row.id), email: String(row.email), name: String(row.name), role: row.role as UserRole,
      phone: row.phone ? String(row.phone) : undefined,
      avatar: row.avatar ? String(row.avatar) : undefined,
      active: Boolean(row.active), mustChangePassword: Boolean(row.must_change_password),
      privacyAcceptedAt: row.privacy_accepted_at ? String(row.privacy_accepted_at) : undefined,
      privacyPolicyVersion: row.privacy_policy_version ? String(row.privacy_policy_version) : undefined,
    },
  };
}

export async function requireSession(request: Request, roles?: UserRole[], allowPasswordChange = false) {
  const session = await getSession(request);
  if (!session) return { error: json({ error: 'Sessão inválida ou expirada.' }, { status: 401 }) } as const;
  if (session.user.mustChangePassword && !allowPasswordChange) return { error: json({ error: 'Altere a senha temporária antes de continuar.' }, { status: 428 }) } as const;
  if (roles && !roles.includes(session.user.role)) return { error: json({ error: 'Você não possui permissão para esta operação.' }, { status: 403 }) } as const;
  return { session } as const;
}

export async function audit(userId: string | null, action: string, module: string, recordId?: string, metadata?: unknown) {
  const safeMetadata = metadata === undefined ? null : JSON.stringify(metadata).slice(0, 4000);
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, module, record_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, sanitizeText(action), sanitizeText(module), recordId ? sanitizeText(recordId, 200) : null, safeMetadata, new Date().toISOString()).run();
}
