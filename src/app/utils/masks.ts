export function onlyDigits(value: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function maskCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCpfOrCnpj(value: string): string {
  const digits = onlyDigits(value);
  return digits.length > 11 ? maskCNPJ(digits) : maskCPF(digits);
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    const total = base.split('').reduce((sum, digit) => sum + Number(digit) * factor--, 0);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) && calcDigit(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const total = base.split('').reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = calcDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calcDigit(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(cnpj[12]) && second === Number(cnpj[13]);
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function maskCEP(value: string): string {
  return onlyDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

export function maskAgency(value: string): string {
  return onlyDigits(value).slice(0, 4);
}

export function maskAccount(value: string): string {
  const digits = onlyDigits(value).slice(0, 12);
  return digits.length > 1 ? `${digits.slice(0, -1)}-${digits.slice(-1)}` : digits;
}

export function maskCurrency(value: string): string {
  const digits = onlyDigits(value).slice(0, 12);
  const cents = Number(digits || '0') / 100;
  return cents.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Legacy RG formats vary by state; nine characters use the common XX.XXX.XXX-X form.
// Longer documents (including CIN/CPF) remain intact rather than losing digits.
export function maskRG(value: string): string {
  const chars = value.toUpperCase().replace(/[^0-9X]/g, '').slice(0, 14);
  if (chars.length === 11 && !chars.includes('X')) return maskCPF(chars);
  if (chars.length > 9) return chars;
  return chars.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})([\dX])$/, '$1-$2');
}

export function parseCurrency(value: string): number {
  return Number(onlyDigits(value) || '0') / 100;
}
