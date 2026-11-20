export type UserRole = 'gerencia' | 'admin' | 'fisio' | 'recepcao';

export interface UserData {
  email: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  name: string;
  role: UserRole;
  telefone?: string;
  foto?: string;
  ativo?: boolean;
  mustChangePassword?: boolean;
  privacyAcceptedAt?: string;
  privacyPolicyVersion?: string;
}

export interface UserPreferences {
  isDark: boolean;
  language?: 'pt' | 'en' | 'es';
}
