// Sistema de Logs do Sistema
export interface SystemLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'logout';
}

export const logAction = (
  userEmail: string,
  userName: string,
  action: string,
  module: string,
  details: string,
  type: SystemLog['type'] = 'view'
): void => {
  const logs: SystemLog[] = JSON.parse(localStorage.getItem('systemLogs') || '[]');

  const newLog: SystemLog = {
    id: Date.now().toString(),
    userId: userEmail,
    userEmail,
    userName,
    action,
    module,
    details,
    timestamp: new Date().toISOString(),
    type
  };

  logs.push(newLog);

  // Manter apenas os últimos 1000 logs para não sobrecarregar o localStorage
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000);
  }

  localStorage.setItem('systemLogs', JSON.stringify(logs));
};

export const getSystemLogs = (): SystemLog[] => {
  return JSON.parse(localStorage.getItem('systemLogs') || '[]');
};

export const getLogsByUser = (userEmail: string): SystemLog[] => {
  const logs = getSystemLogs();
  return logs.filter(log => log.userEmail === userEmail);
};

export const getLogsByModule = (module: string): SystemLog[] => {
  const logs = getSystemLogs();
  return logs.filter(log => log.module === module);
};

export const clearLogs = (): void => {
  localStorage.setItem('systemLogs', '[]');
};

// Registrar último login
export const registerLogin = (userEmail: string, userName: string): void => {
  const loginData = {
    email: userEmail,
    name: userName,
    timestamp: new Date().toISOString(),
    ip: 'localhost' // Em produção, pegar IP real
  };

  localStorage.setItem(`lastLogin_${userEmail}`, JSON.stringify(loginData));
  logAction(userEmail, userName, 'Login realizado', 'Autenticação', 'Usuário entrou no sistema', 'login');
};

export const getLastLogin = (userEmail: string) => {
  const data = localStorage.getItem(`lastLogin_${userEmail}`);
  return data ? JSON.parse(data) : null;
};

// Sistema de confirmação para ações perigosas
export const confirmDangerousAction = (message: string): boolean => {
  const confirmationsEnabled = localStorage.getItem('dangerousActionsConfirmation') !== 'false';

  if (!confirmationsEnabled) {
    return true;
  }

  return window.confirm(message);
};

export const setDangerousActionsConfirmation = (enabled: boolean): void => {
  localStorage.setItem('dangerousActionsConfirmation', enabled.toString());
};

export const getDangerousActionsConfirmation = (): boolean => {
  return localStorage.getItem('dangerousActionsConfirmation') !== 'false';
};
