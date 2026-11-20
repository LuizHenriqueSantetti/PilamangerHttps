import { storageService } from './storageService';
import { getClientDevice, normalizeEmail } from '../utils/security';

export type AccessLogStatus = 'success' | 'failed' | 'blocked' | 'logout' | 'password_reset_requested';

export interface AccessLogEntry {
  id: string;
  email: string;
  status: AccessLogStatus;
  message: string;
  createdAt: string;
  browser: string;
  platform: string;
  userAgent: string;
}

const ACCESS_LOG_KEY = 'accessLogs';

export const accessLogService = {
  list(): AccessLogEntry[] {
    return storageService.get<AccessLogEntry[]>(ACCESS_LOG_KEY, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  record(email: string, status: AccessLogStatus, message: string) {
    const device = getClientDevice();
    const entry: AccessLogEntry = {
      id: `access-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      email: normalizeEmail(email || 'nao-informado'),
      status,
      message,
      createdAt: new Date().toISOString(),
      ...device,
    };
    storageService.set(ACCESS_LOG_KEY, [entry, ...this.list()].slice(0, 500));
    window.dispatchEvent(new CustomEvent('pilamanager:access-log-updated', { detail: entry }));
    return entry;
  },
};
