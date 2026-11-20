import { describe, it, expect } from 'vitest';
import { calculateCommission } from '../src/server/billingRules';
import { buildFinancialLedger } from '../src/app/services/financialLedger';
import { maskRG, maskCurrency, parseCurrency } from '../src/app/utils/masks';
describe('integração financeira', () => {
  const payment = { id: 'p', valor: 240, status: 'pago', dataPagamento: '2026-10-17', quantidadeAulas: 8 };
  const plan = { quantidadeAulas: 12 };
  const prof = { tipoComissao: 'percentual', comissaoPercentual: 30, valorFixoAula: 5 };
  it('usa aulas da cobrança recebida, sem alterar histórico ao editar plano', () => {
    expect(calculateCommission(payment, plan, prof, 0)).toMatchObject({ valorAula: 30, comissao: 9 });
    expect(calculateCommission(payment, plan, { ...prof, tipoComissao: 'fixa' }, 0).comissao).toBe(5);
    expect(calculateCommission(payment, plan, { ...prof, tipoComissao: 'hibrida' }, 0).comissao).toBe(14);
  });
  it('recusa cobrança pendente, quantidade excedida e regra inválida', () => {
    expect(() => calculateCommission({ ...payment, status: 'pendente' }, plan, prof, 0)).toThrow();
    expect(() => calculateCommission(payment, plan, prof, 8)).toThrow();
    expect(() => calculateCommission(payment, plan, { ...prof, comissaoPercentual: 101 }, 0)).toThrow();
  });
  it('consolida fontes sem duplicar recebimento nem contar pendentes', () => {
    const ledger = buildFinancialLedger([{ id: 't', pagamentoId: 'p', valor: 240, tipo: 'receita', data: '2026-10-17' }], [payment, { ...payment, id: 'pending', status: 'pendente' }], [{ id: 'c', comissao: 9, status: 'pago', pagoEm: '2026-10-17', fisioterapeuta: 'Teste' }, { id: 'c2', comissao: 9, status: 'pendente' }]);
    expect(ledger).toHaveLength(2);
    expect(ledger.filter(x => x.tipo === 'receita').reduce((s, x) => s + x.valor, 0)).toBe(240);
    expect(ledger.filter(x => x.tipo === 'despesa')[0].valor).toBe(9);
  });
  it('formata moeda e RG sem truncar CIN', () => {
    expect(parseCurrency(maskCurrency('123456'))).toBe(1234.56);
    expect(maskRG('12345678X')).toBe('12.345.678-X');
    expect(maskRG('12345678901')).toBe('123.456.789-01');
  });
});
