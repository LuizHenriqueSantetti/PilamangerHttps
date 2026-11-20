import { describe, expect, it } from 'vitest';
import { patientEnrollmentService } from '../src/app/services/patientEnrollmentService';

const patient = { id: 'patient-1', nome: 'Ana Lima', cpf: '12345678901', email: 'ana@example.com', telefone: '(45) 99999-9999' };

describe('cadastro de paciente com plano', () => {
  it('permite cadastrar sem plano sem criar associação ou cobrança', () => {
    const result = patientEnrollmentService.createPatient(patient);
    expect(result.patient.plano).toBe('');
    expect(JSON.parse(localStorage.getItem('pacientes') || '[]')).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('planosAtribuidos') || '[]')).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('pagamentos') || '[]')).toHaveLength(0);
  });

  it('vincula plano ativo, saldo, validade e cobrança pendente', () => {
    localStorage.setItem('planos', JSON.stringify([{ id: 'plan-1', nome: 'Essencial', preco: 300, quantidadeAulas: 8, duracao: 'mensal', ativo: true }]));
    const result = patientEnrollmentService.createPatient(patient, 'plan-1');
    expect(result.patient).toMatchObject({ planoId: 'plan-1', plano: 'Essencial', aulasRestantes: 8 });
    expect(result.assignment).toMatchObject({ pacienteId: 'patient-1', planoId: 'plan-1', status: 'ativo', aulasRestantes: 8 });
    expect(result.payment).toMatchObject({ pacienteId: 'patient-1', planoId: 'plan-1', valor: 300, status: 'pendente' });
  });

  it('rejeita plano inativo, incompleto e paciente duplicado', () => {
    localStorage.setItem('planos', JSON.stringify([{ id: 'inactive', nome: 'Antigo', preco: 10, quantidadeAulas: 1, duracao: 'mensal', ativo: false }, { id: 'invalid', nome: 'Sem aulas', preco: 10, duracao: 'mensal', ativo: true }]));
    expect(() => patientEnrollmentService.createPatient(patient, 'inactive')).toThrow('inativo');
    expect(() => patientEnrollmentService.createPatient(patient, 'invalid')).toThrow('quantidade de aulas');
    patientEnrollmentService.createPatient(patient);
    expect(() => patientEnrollmentService.createPatient({ ...patient, id: 'patient-2' })).toThrow('CPF');
  });

  it('troca o plano encerrando o vínculo anterior e mantém uma única fonte de contagem', () => {
    localStorage.setItem('planos', JSON.stringify([
      { id: 'plan-1', nome: 'Essencial', preco: 300, quantidadeAulas: 8, duracao: 'mensal', ativo: true },
      { id: 'plan-2', nome: 'Premium', preco: 500, quantidadeAulas: 12, duracao: 'trimestral', ativo: true },
    ]));
    const created = patientEnrollmentService.createPatient({ ...patient, status: 'ativo' }, 'plan-1');
    const updated = patientEnrollmentService.updatePatient(created.patient, 'plan-2');
    expect(updated.patient).toMatchObject({ planoId: 'plan-2', plano: 'Premium' });
    expect(patientEnrollmentService.assignments().filter(item => item.status === 'ativo')).toHaveLength(1);
    expect(patientEnrollmentService.assignments().find(item => item.planoId === 'plan-1')?.status).toBe('encerrado');
    expect(patientEnrollmentService.membersForPlan('plan-1')).toHaveLength(0);
    expect(patientEnrollmentService.membersForPlan('plan-2')).toHaveLength(1);
  });

  it('exclui da contagem pacientes inativos, vínculos vencidos e planos inativos', () => {
    localStorage.setItem('planos', JSON.stringify([{ id: 'plan-1', nome: 'Essencial', preco: 300, quantidadeAulas: 8, duracao: 'mensal', ativo: true }]));
    const created = patientEnrollmentService.createPatient({ ...patient, status: 'ativo' }, 'plan-1');
    expect(patientEnrollmentService.membersForPlan('plan-1')).toHaveLength(1);
    localStorage.setItem('pacientes', JSON.stringify([{ ...created.patient, status: 'indisponivel' }]));
    expect(patientEnrollmentService.membersForPlan('plan-1')).toHaveLength(0);
  });

  it('recusa criação e edição quando a permissão do serviço local é negada', () => {
    const denied = { visualizar: true, criar: false, editar: false, excluir: false, exportar: false, restrito: false };
    expect(() => patientEnrollmentService.createPatient(patient, undefined, denied)).toThrow('permissao');
    localStorage.setItem('pacientes', JSON.stringify([patient]));
    expect(() => patientEnrollmentService.updatePatient(patient, undefined, denied)).toThrow('permissao');
  });

  it('migra vínculo antigo salvo somente no cadastro do paciente', () => {
    localStorage.setItem('planos', JSON.stringify([{ id:'plan-1', nome:'Essencial', preco:300, quantidadeAulas:8, duracao:'mensal', ativo:true }]));
    localStorage.setItem('pacientes', JSON.stringify([{ ...patient, status:'ativo', planoId:'plan-1', plano:'Essencial', dataCadastro:'2026-01-01' }]));
    const members = patientEnrollmentService.membersForPlan('plan-1');
    expect(members).toHaveLength(1);
    expect(members[0].assignment).toMatchObject({ pacienteId:'patient-1', planoId:'plan-1', status:'ativo', migratedFromPatient:true });
    expect(patientEnrollmentService.assignments()).toHaveLength(1);
  });

  it('renova o mesmo plano quando o vínculo anterior está vencido', () => {
    localStorage.setItem('planos', JSON.stringify([{ id:'plan-1', nome:'Essencial', preco:300, quantidadeAulas:8, duracao:'mensal', ativo:true }]));
    localStorage.setItem('pacientes', JSON.stringify([{ ...patient, status:'ativo', planoId:'plan-1', plano:'Essencial' }]));
    localStorage.setItem('planosAtribuidos', JSON.stringify([{ id:'old', pacienteId:'patient-1', pacienteNome:'Ana Lima', planoId:'plan-1', nomePlano:'Essencial', status:'ativo', dataInicio:'2025-01-01', dataVencimento:'2025-02-01', createdAt:'2025-01-01T00:00:00.000Z' }]));
    patientEnrollmentService.updatePatient({ ...patient, status:'ativo', planoId:'plan-1', plano:'Essencial' }, 'plan-1');
    const assignments = patientEnrollmentService.assignments();
    expect(assignments.find(item => item.id === 'old')?.status).toBe('encerrado');
    expect(assignments.filter(item => item.status === 'ativo')).toHaveLength(1);
    expect(patientEnrollmentService.membersForPlan('plan-1')).toHaveLength(1);
  });
});
