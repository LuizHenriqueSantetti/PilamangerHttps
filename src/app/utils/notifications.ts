import { flushRemoteStorage, hasPendingRemoteChanges } from '../services/remoteStorageSync';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export interface AppNotification { id: string; type: NotificationType; message: string; leaving?: boolean; persistent?: boolean }
export const NOTIFICATION_EVENT = 'pilamanager:notification';
const EMPTY: AppNotification[] = [];
let items = EMPTY;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const recent = new Map<string, number>();
const activeActions = new Set<string>();
const publish = () => listeners.forEach(listener => listener());
export const getNotifications = () => items;
export const getServerNotifications = () => EMPTY;
export function subscribeNotifications(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

export function publicMessage(message: unknown) {
  const value = String(message ?? '').replace(/\s+/g, ' ').trim();
  if (/permissão|não possui acesso|nao possui acesso/i.test(value)) return 'Você não tem permissão para realizar esta ação.';
  if (/sessão.*(?:inválida|expirada)/i.test(value)) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (!value || /SQLITE|D1_ERROR|constraint failed|stack trace|SELECT .+ FROM|INSERT INTO|UPDATE .+ SET|pbkdf2|password_hash|Bearer\s|api[_-]?key/i.test(value)) return 'Não foi possível concluir a operação. Tente novamente.';
  if (/Failed to fetch|fetch failed|NetworkError|ECONN|network request/i.test(value)) return 'Falha de conexão com o servidor. Tente novamente.';
  return value.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[e-mail]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[documento]').slice(0, 240);
}

export function dismissNotification(id: string) {
  clearTimeout(timers.get(id)); timers.delete(id);
  items = items.map(item => item.id === id ? { ...item, leaving: true } : item); publish();
  timers.set(id, setTimeout(() => { items = items.filter(item => item.id !== id); timers.delete(id); publish(); }, 180));
}
function emit(message: string, type: NotificationType, persistent = false) {
  const clean = publicMessage(message), key = type + ':' + clean, now = Date.now();
  if (recent.has(key) && now - recent.get(key)! < 1200) return '';
  recent.set(key, now); for (const [key, time] of recent) if (now - time > 8000) recent.delete(key);
  const item: AppNotification = { id: crypto.randomUUID(), type, message: clean, persistent };
  const removed = items.length >= 3 ? items[0] : null;
  if (removed) { clearTimeout(timers.get(removed.id)); timers.delete(removed.id); }
  items = [...items.slice(-2), item]; publish();
  if (!persistent) timers.set(item.id, setTimeout(() => dismissNotification(item.id), 4000));
  window.dispatchEvent(new CustomEvent<AppNotification>(NOTIFICATION_EVENT, { detail: item }));
  return item.id;
}
export function notify(message: string, type: NotificationType = 'info') {
  if (type === 'success' && hasPendingRemoteChanges()) {
    void flushRemoteStorage().then(() => emit(message, type)).catch(error => emit(publicMessage(error instanceof Error ? error.message : error), 'error'));
    return;
  }
  emit(message, type);
}
export function notifyError(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  const message = publicMessage(error instanceof Error ? error.message : fallback);
  notify(message, /sessão expirou|conflito|ocupado|outra sessão/i.test(message) ? 'warning' : 'error');
}

type ActionResult<T> = { ok: true; value: T } | { ok: false };
const recoverableActions = new Map<string, { value: unknown; success: string }>();

// Preserve the result of a queued write: retry confirms that write, never creates it again.
export async function performActionWithResult<T>(key: string, operation: () => T | Promise<T>, success: string): Promise<ActionResult<T>> {
  if (activeActions.has(key)) return { ok: false };
  activeActions.add(key);
  let progress = '';
  let completed = false;
  let value: T | undefined;
  const recovered = recoverableActions.get(key);
  const timer = setTimeout(() => { progress = emit('Processando…', 'info', true); }, 450);
  try {
    if (hasPendingRemoteChanges()) await flushRemoteStorage();
    if (recovered) {
      recoverableActions.delete(key);
      notify(recovered.success, 'success');
      return { ok: true, value: recovered.value as T };
    }
    value = await operation(); completed = true;
    await flushRemoteStorage();
    notify(success, 'success');
    return { ok: true, value };
  } catch (error) {
    if (completed && hasPendingRemoteChanges()) recoverableActions.set(key, { value, success });
    notifyError(error); return { ok: false };
  } finally { clearTimeout(timer); if (progress) dismissNotification(progress); activeActions.delete(key); }
}
export async function performAction(key: string, operation: () => unknown | Promise<unknown>, success: string) {
  return (await performActionWithResult(key, operation, success)).ok;
}

export interface ConfirmationRequest { id: string; message: string; destructive: boolean; resolve: (confirmed: boolean) => void }
export const CONFIRMATION_EVENT = 'pilamanager:confirmation';
let confirming = false;
export function confirmAction(message: string, destructive = true): Promise<boolean> {
  if (confirming) return Promise.resolve(false);
  confirming = true;
  return new Promise(resolve => window.dispatchEvent(new CustomEvent<ConfirmationRequest>(CONFIRMATION_EVENT, {
    detail: { id: crypto.randomUUID(), message: publicMessage(message), destructive, resolve: value => { confirming = false; resolve(value); } },
  })));
}

export function installAlertBridge() {
  if ((window as unknown as { __pmAlertBridge?: boolean }).__pmAlertBridge) return;
  (window as unknown as { __pmAlertBridge?: boolean }).__pmAlertBridge = true;
  window.addEventListener('pilamanager:cache-cleared', () => {
    recoverableActions.clear();
    items.forEach(item => clearTimeout(timers.get(item.id)));
    timers.clear(); items = EMPTY; recent.clear(); publish();
  });
  window.alert = (message?: unknown) => {
    const text = String(message ?? '');
    const type = /erro|falha|não foi possível|nao foi possivel|incorreta/i.test(text) ? 'error'
      : /preencha|informe|selecione|revise|já existe|ja existe|não existem|nao existem|obrigat|aceite|ocupado|conflito|indisponível/i.test(text) ? 'warning'
      : /sucesso|salv[oa]|atualizad[oa]|gerad[oa]|copiad[oa]/i.test(text) ? 'success' : 'info';
    notify(text, type);
  };
}
