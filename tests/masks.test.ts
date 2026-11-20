import { describe, expect, it } from 'vitest';
import { isValidPhone, maskPhone, onlyDigits } from '../src/app/utils/masks';

describe('máscara brasileira de telefone', () => {
  it('formata telefone fixo e celular', () => {
    expect(maskPhone('4533333333')).toBe('(45) 3333-3333');
    expect(maskPhone('45999999999')).toBe('(45) 99999-9999');
  });

  it('aceita colagem formatada, remoção e limita a onze dígitos', () => {
    expect(maskPhone('(45) 99999-9999')).toBe('(45) 99999-9999');
    expect(maskPhone('(45) 99999-999')).toBe('(45) 9999-9999');
    expect(onlyDigits(maskPhone('45 99999-9999 123'))).toBe('45999999999');
  });

  it('valida apenas números brasileiros com DDD e 10 ou 11 dígitos', () => {
    expect(isValidPhone('(45) 3333-3333')).toBe(true);
    expect(isValidPhone('(45) 99999-9999')).toBe(true);
    expect(isValidPhone('459999999')).toBe(false);
  });
});
