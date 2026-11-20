import { describe, it, expect } from 'vitest';
import { buildDemoHistory, DEMO_IMPORT_DEADLINE, DEMO_IMPORT_ID, DEMO_SCENARIOS } from '../src/server/demoHistory';
import { isCalendarDate, studioDate, validateOperationalDates } from '../src/server/operationalDates';
import { buildFinancialLedger } from '../src/app/services/financialLedger';
import { isValidCPF } from '../src/app/utils/masks';

export const source = () => ({
  pacientes: [{ id: 'existing', nome: 'Existente', dataCadastro: '2026-10-22' }],
  planos: ['Essencial', 'Equilíbrio', 'Intensivo'].map((name, index) => ({ id: `plan-${index}`, nome: `DEMO — ${name}`, preco: [200, 360, 480][index], quantidadeAulas: [4, 8, 12][index], ativo: true })),
  profissionais: ['Kaue Cardoso', 'Felipe Donatoni', 'Gabriel Benine'].map((nome, index) => ({ id: `pro-${index}`, nome, status: 'ativo', registroProfissional: 'DEMO-TESTE', tipoComissao: 'percentual', comissaoPercentual: [40, 35, 30][index], valorFixoAula: 0 })),
  planosAtribuidos: [], pagamentos: [], agendamentos: [], detalheAulasPagamento: [],
});
const now = new Date('2026-10-22T15:00:00Z');

describe('carga única e limitada de demonstração', () => {
  it('preserva os registros existentes e não modifica o snapshot original', () => {
    const original = source(), snapshot = JSON.stringify(original);
    const { collections } = buildDemoHistory(original, 'manager', now);
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(collections.pacientes).toHaveLength(9);
    expect(collections.pacientes[0]).toEqual(original.pacientes[0]);
    expect(collections.planos).toEqual(original.planos);
    expect(collections.profissionais).toEqual(original.profissionais);
  });
  it('diversifica aniversários, idades, descrições e datas operacionais', () => {
    const { collections: data, summary } = buildDemoHistory(source(), 'manager', now);
    const clients = data.pacientes.slice(1);
    expect(new Set(clients.map(p => p.idade)).size).toBe(8);
    expect(new Set(clients.map(p => p.dataNascimento)).size).toBe(8);
    expect(new Set(clients.map(p => p.dataCadastro)).size).toBe(8);
    expect(new Set(clients.map(p => p.observacoes.dores)).size).toBe(8);
    expect(clients.every(p => isValidCPF(p.cpf) && p.email.endsWith('@example.com') && p.demonstration && p.privacyConsent.demonstration)).toBe(true);
    expect(data.pagamentos.filter(p => p.status === 'pago').map(p => p.dataPagamento)).toEqual(['2026-09-03', '2026-09-10', '2026-09-22', '2026-10-02', '2026-10-07']);
    expect(data.agendamentos.filter(a => a.date < '2026-10-22')).toHaveLength(5);
    expect(data.agendamentos.filter(a => a.date > '2026-10-22')).toHaveLength(3);
    expect(summary).toMatchObject({ clients: 8, paymentsReceived: 5, paymentsPending: 3, commissions: 5, received: 1600 });
    expect(data.planosAtribuidos.filter(p => p.status === 'encerrado')).toHaveLength(3);
  });
  it('relaciona corretamente pacientes, planos, aulas, cobranças e comissões', () => {
    const { collections: data } = buildDemoHistory(source(), 'manager', now);
    for (const commission of data.detalheAulasPagamento) {
      const appointment = data.agendamentos.find(a => a.id === commission.agendamentoId);
      const payment = data.pagamentos.find(p => p.id === commission.pagamentoId);
      expect(appointment.studentId).toBe(payment.pacienteId);
      expect(payment.dataPagamento <= appointment.date).toBe(true);
      expect(appointment.professorId).toBe(commission.profissionalId);
    }
    expect(data.detalheAulasPagamento.reduce((sum, c) => sum + c.comissao, 0)).toBe(83.5);
    const ledger = buildFinancialLedger([], data.pagamentos, data.detalheAulasPagamento);
    expect(ledger).toHaveLength(5);
    expect(ledger.filter(item => item.data.startsWith('2026-09')).reduce((sum, item) => sum + item.valor, 0)).toBe(1040);
    expect(ledger.filter(item => item.data.startsWith('2026-10')).reduce((sum, item) => sum + item.valor, 0)).toBe(560);
  });
  it('recusa duplicação, ausência de pré-requisito e execução fora da janela', () => {
    const first = buildDemoHistory(source(), 'manager', now);
    expect(() => buildDemoHistory(first.collections, 'manager', now)).toThrow('Já existe');
    expect(() => buildDemoHistory({ ...source(), profissionais: [] }, 'manager', now)).toThrow('Confira');
    expect(() => buildDemoHistory(source(), 'manager', new Date(DEMO_IMPORT_DEADLINE))).toThrow('expirou');
    expect(() => buildDemoHistory(source(), 'manager', new Date('2026-10-21T15:00:00Z'))).toThrow('expirou');
    expect(DEMO_SCENARIOS.every(s => s.nome && s.paid < '2026-10-22')).toBe(true);
    expect(DEMO_IMPORT_ID).toBe('authorized-demo-history-2026-10-22');
  });
});

describe('bloqueio de datas passadas fora da carga única', () => {
  it('usa data civil de São Paulo e valida datas de calendário', () => {
    expect(studioDate(new Date('2026-10-23T01:00:00Z'))).toBe('2026-10-22');
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-10-22')).toBe(true);
  });
  it.each(['pacientes', 'pagamentos', 'agendamentos'])('recusa criar ou mover %s para ontem, permite hoje e futuro e preserva histórico', key => {
    const field = key === 'pacientes' ? 'dataCadastro' : key === 'pagamentos' ? 'vencimento' : 'date';
    const old = [{ id: 'old', [field]: '2026-09-03', status: 'pendente' }];
    expect(validateOperationalDates(key, old, [{ id: 'new', [field]: '2026-10-21' }], '2026-10-22')).toContain('passadas');
    expect(validateOperationalDates(key, old, [{ id: 'old', [field]: '2026-10-20' }], '2026-10-22')).toContain('passadas');
    expect(validateOperationalDates(key, old, [{ ...old[0], status: 'confirmado' }], '2026-10-22')).toBeNull();
    expect(validateOperationalDates(key, old, [{ id: 'new', [field]: '2026-10-22' }], '2026-10-22')).toBeNull();
    expect(validateOperationalDates(key, old, [{ id: 'new', [field]: '2026-10-29' }], '2026-10-22')).toBeNull();
  });
});
