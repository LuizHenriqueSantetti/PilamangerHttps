import { storageService } from './storageService';
import { authService } from './authService';

export type AuditActionType = 'create' | 'update' | 'delete' | 'restore' | 'login' | 'logout' | 'security' | 'permission';

export interface AuditEntry {
  id: string;
  userEmail: string;
  userName: string;
  action: string;
  actionType: AuditActionType;
  module: string;
  recordId?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

const AUDIT_KEY = 'auditTrail';

export const auditService = {
  list(): AuditEntry[] {
    return storageService.get<AuditEntry[]>(AUDIT_KEY, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  record(input: Omit<AuditEntry, 'id' | 'createdAt' | 'userEmail' | 'userName'> & { userEmail?: string; userName?: string }) {
    const user = authService.getCurrentUser();
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userEmail: input.userEmail || user?.email || 'sistema',
      userName: input.userName || user?.name || 'Sistema',
      action: input.action,
      actionType: input.actionType,
      module: input.module,
      recordId: input.recordId,
      before: input.before,
      after: input.after,
      createdAt: new Date().toISOString(),
    };
    // The API audits every accepted write. Restricted users must not enqueue
    // a management-only aggregate alongside their otherwise valid changes.
    if (user && ['gerencia', 'admin'].includes(user.role)) {
      storageService.set(AUDIT_KEY, [entry, ...this.list()].slice(0, 1000));
    }
    window.dispatchEvent(new CustomEvent('pilamanager:audit-updated', { detail: entry }));
    return entry;
  },
};
