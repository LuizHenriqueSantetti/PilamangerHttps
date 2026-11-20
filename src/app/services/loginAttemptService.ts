import { storageService } from './storageService';
import { normalizeEmail } from '../utils/security';
import { accessLogService } from './accessLogService';

const ATTEMPTS_KEY = 'loginAttempts';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

interface AttemptState {
  count: number;
  lockedUntil?: number;
  lastAttemptAt?: string;
}

function getAll(): Record<string, AttemptState> {
  return storageService.get<Record<string, AttemptState>>(ATTEMPTS_KEY, {});
}

function saveAll(value: Record<string, AttemptState>) {
  storageService.set(ATTEMPTS_KEY, value);
}

export const loginAttemptService = {
  getState(email: string) {
    const key = normalizeEmail(email);
    const state = getAll()[key] || { count: 0 };
    const now = Date.now();
    if (state.lockedUntil && state.lockedUntil <= now) {
      this.reset(email);
      return { count: 0, remaining: MAX_ATTEMPTS, locked: false, remainingMs: 0 };
    }
    return {
      count: state.count,
      remaining: Math.max(MAX_ATTEMPTS - state.count, 0),
      locked: Boolean(state.lockedUntil && state.lockedUntil > now),
      remainingMs: state.lockedUntil ? Math.max(state.lockedUntil - now, 0) : 0,
    };
  },

  registerFailure(email: string) {
    const key = normalizeEmail(email);
    const all = getAll();
    const previous = all[key] || { count: 0 };
    const count = previous.count + 1;
    const lockedUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : previous.lockedUntil;
    all[key] = { count, lockedUntil, lastAttemptAt: new Date().toISOString() };
    saveAll(all);
    accessLogService.record(email, lockedUntil ? 'blocked' : 'failed', lockedUntil ? 'Login bloqueado por excesso de tentativas' : `Tentativa invalida. Restam ${Math.max(MAX_ATTEMPTS - count, 0)} tentativa(s).`);
    return this.getState(email);
  },

  reset(email: string) {
    const key = normalizeEmail(email);
    const all = getAll();
    delete all[key];
    saveAll(all);
  },
};
