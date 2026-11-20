import { UserData, UserPreferences, UserRole } from '../types/auth';
import { normalizeEmail } from '../utils/security';

let currentUser: UserData | null = null;
let usersCache: UserData[] = [];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  }).catch(() => { throw new Error('Falha de conexão com o servidor. Tente novamente.'); });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) {
    if(response.status===401&&currentUser&&url!=='/api/auth/login')window.dispatchEvent(new Event('pilamanager:session-expired'));
    if(response.status===403)window.dispatchEvent(new Event('pilamanager:permission-denied'));
    throw new Error(body.error || 'Não foi possível concluir a operação.');
  }
  return body;
}

function preferenceKey(email: string) {
  return `preferences_${normalizeEmail(email)}`;
}

function saveLocalPreferences(email: string, value: UserPreferences) {
  localStorage.setItem(preferenceKey(email), JSON.stringify(value));
}

export const authService = {
  async initialize(): Promise<UserData[]> {
    try {
      const result = await api<{ user: UserData }>('/api/auth/session', { cache: 'no-store' });
      currentUser = result.user;
      usersCache = result.user ? [result.user] : [];
    } catch {
      currentUser = null;
      usersCache = [];
    }
    return usersCache;
  },

  listUsers(): UserData[] { return usersCache; },

  async refreshUsers(): Promise<UserData[]> {
    const result = await api<{ users: UserData[] }>('/api/users', { cache: 'no-store' });
    usersCache = result.users;
    const refreshed = currentUser ? usersCache.find(user => user.email === currentUser?.email) : null;
    if (refreshed) currentUser = refreshed;
    return usersCache;
  },

  listSavedLoginAccounts(): Pick<UserData, 'name' | 'email'>[] {
    return currentUser ? [{ name: currentUser.name, email: currentUser.email }] : [];
  },

  getCurrentUser(): UserData | null { return currentUser; },

  async login(email: string, password: string, remember: boolean): Promise<{ ok: boolean; user?: UserData; error?: string; remaining?: number }> {
    try {
      const result = await api<{ user: UserData }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, remember }) });
      currentUser = result.user;
      usersCache = [result.user];
      return { ok: true, user: result.user };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'E-mail ou senha incorretos.' };
    }
  },

  async register(input: { name: string; email: string; password: string; role: UserRole; privacyAcceptedAt?: string }): Promise<UserData> {
    const result = await api<{ user: UserData }>('/api/users', { method: 'POST', body: JSON.stringify(input) });
    usersCache = [...usersCache.filter(user => user.email !== result.user.email), result.user];
    return result.user;
  },

  async acceptPrivacyPolicy(_email: string): Promise<UserData> {
    const result = await api<{ privacyAcceptedAt: string; privacyPolicyVersion: string }>('/api/privacy', { method: 'POST', body: '{}' });
    if (!currentUser) throw new Error('Sessão expirada.');
    currentUser = { ...currentUser, ...result };
    usersCache = usersCache.map(user => user.email === currentUser?.email ? currentUser : user);
    return currentUser;
  },

  async updatePassword(_email: string, currentPassword: string, newPassword: string): Promise<boolean> {
    await api('/api/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
    if (currentUser) currentUser = { ...currentUser, mustChangePassword: false };
    return true;
  },

  async updateUser(originalEmail: string, input: { name: string; email: string; role: UserRole; password?: string; ativo?: boolean; telefone?: string; foto?: string }): Promise<UserData> {
    const result = await api<{ user: UserData }>('/api/users', { method: 'PATCH', body: JSON.stringify({ originalEmail, ...input }) });
    usersCache = usersCache.map(user => user.email === originalEmail ? result.user : user);
    if (currentUser?.email === originalEmail) currentUser = result.user;
    window.dispatchEvent(new Event('pilamanager:profile-updated'));
    return result.user;
  },

  async deleteUser(email: string): Promise<void> {
    await api(`/api/users?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
    usersCache = usersCache.filter(user => user.email !== email);
  },

  async logout(): Promise<void> {
    try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); } finally {
      currentUser = null;
      usersCache = [];
    }
  },

  getPreferences(email: string): UserPreferences {
    try { return JSON.parse(localStorage.getItem(preferenceKey(email)) || '{}') as UserPreferences; }
    catch { return { isDark: false }; }
  },

  savePreferences(email: string, preferences: UserPreferences): void { saveLocalPreferences(email, preferences); },
};
