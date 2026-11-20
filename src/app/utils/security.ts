export type PasswordStrengthLevel = 'fraca' | 'media' | 'forte';

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  score: number;
  label: string;
  color: string;
  requirements: Array<{ id: string; label: string; met: boolean }>;
  isStrong: boolean;
}

const encoder = new TextEncoder();

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function sanitizeText(value: string) {
  return String(value ?? '').replace(/[<>]/g, '').trim();
}

export function getClientDevice() {
  const ua = navigator.userAgent;
  const browser = ua.includes('Edg/') ? 'Edge'
    : ua.includes('Chrome/') ? 'Chrome'
    : ua.includes('Firefox/') ? 'Firefox'
    : ua.includes('Safari/') ? 'Safari'
    : 'Navegador desconhecido';
  const platform = navigator.platform || 'Dispositivo desconhecido';
  return { browser, platform, userAgent: ua };
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  if (crypto?.subtle) {
    return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  }

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

export async function hashPassword(password: string, salt = randomSalt()) {
  const pepper = 'pilamanager-client-v1';
  return {
    salt,
    hash: await sha256(`${salt}:${password}:${pepper}`),
  };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const result = await hashPassword(password, salt);
  return result.hash === expectedHash;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const requirements = [
    { id: 'length', label: '8 caracteres', met: password.length >= 8 },
    { id: 'upper', label: 'letra maiuscula', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'letra minuscula', met: /[a-z]/.test(password) },
    { id: 'number', label: 'numero', met: /\d/.test(password) },
    { id: 'special', label: 'caractere especial', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = requirements.filter(item => item.met).length;
  const level: PasswordStrengthLevel = score >= 5 ? 'forte' : score >= 3 ? 'media' : 'fraca';
  return {
    level,
    score,
    label: level === 'forte' ? 'Forte' : level === 'media' ? 'Media' : 'Fraca',
    color: level === 'forte' ? '#35A978' : level === 'media' ? '#E5A83B' : '#D95C5C',
    requirements,
    isStrong: score === requirements.length,
  };
}
