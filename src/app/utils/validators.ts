const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Informe o e-mail.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Informe um e-mail valido.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Informe a senha.';
  if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Informe o nome completo.';
  if (name.trim().length < 3) return 'Informe um nome com pelo menos 3 caracteres.';
  return null;
}

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length < 10 || digits.length > 11) return 'Informe um telefone valido.';
  return null;
}
