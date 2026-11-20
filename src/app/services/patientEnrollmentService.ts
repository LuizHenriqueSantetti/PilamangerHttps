import { storageService } from './storageService';
import type { ModulePermission } from '../utils/permissions';
import { assertPermission } from '../utils/permissions';

export type StoredPlan = {
  id: string;
  nome: string;
  preco: number;
  duracao: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  quantidadeAulas?: number;
  ativo: boolean;
};

export type PlanAssignment = {
  id: string; pacienteId: string; pacienteNome: string; planoId: string; nomePlano: string;
  status: 'ativo' | 'encerrado' | 'cancelado'; quantidadeAulas?: number; aulasRestantes?: number;
  dataInicio: string; dataVencimento?: string; createdAt: string; endedAt?: string; responsavel?: string; migratedFromPatient?: boolean;
};

const DURATION_MONTHS: Record<StoredPlan['duracao'], number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

function addMonths(date: Date, months: number): string {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result.toISOString().slice(0, 10);
}

export const patientEnrollmentService = {
  activePlans(): StoredPlan[] {
    return storageService.get<StoredPlan[]>('planos', []).filter(plan => plan.ativo !== false);
  },

  assignments(): PlanAssignment[] {
    const stored = storageService.get<PlanAssignment[]>('planosAtribuidos', []);
    const patients = storageService.get<any[]>('pacientes', []);
    const plans = storageService.get<StoredPlan[]>('planos', []);
    const additions: PlanAssignment[] = [];
    const today = new Date();
    for (const patient of patients) {
      if (!patient?.id || (!patient.planoId && !patient.plano)) continue;
      if (stored.some(item => String(item.pacienteId) === String(patient.id) && item.status === 'ativo')) continue;
      const plan = plans.find(item => String(item.id) === String(patient.planoId)) || plans.find(item => String(item.nome).trim().toLocaleLowerCase() === String(patient.plano).trim().toLocaleLowerCase());
      if (!plan || plan.ativo === false) continue;
      const start = typeof patient.dataCadastro === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(patient.dataCadastro) ? patient.dataCadastro : today.toISOString().slice(0, 10);
      const expiry = typeof patient.planoValidoAte === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(patient.planoValidoAte) ? patient.planoValidoAte : addMonths(today, DURATION_MONTHS[plan.duracao]);
      additions.push({ id: crypto.randomUUID(), pacienteId:String(patient.id), pacienteNome:String(patient.nome || ''), planoId:String(plan.id), nomePlano:plan.nome, status:'ativo', quantidadeAulas:Number(plan.quantidadeAulas || 0), aulasRestantes:Number(patient.aulasRestantes ?? plan.quantidadeAulas ?? 0), dataInicio:start, dataVencimento:expiry, createdAt:new Date().toISOString(), responsavel:'Migração automática', migratedFromPatient:true });
    }
    if (additions.length) {
      const migrated = [...stored, ...additions];
      storageService.set('planosAtribuidos', migrated);
      return migrated;
    }
    return stored;
  },

  activeAssignments(): PlanAssignment[] {
    const patients = storageService.get<any[]>('pacientes', []);
    const plans = storageService.get<StoredPlan[]>('planos', []);
    const patientById = new Map(patients.map(item => [String(item.id), item]));
    const planById = new Map(plans.map(item => [String(item.id), item]));
    const today = new Date().toISOString().slice(0, 10);
    const seen = new Set<string>();
    return this.assignments().filter(item => {
      const patient = patientById.get(String(item.pacienteId));
      const plan = planById.get(String(item.planoId));
      const key = `${item.pacienteId}:${item.planoId}`;
      if (seen.has(key) || item.status !== 'ativo' || !patient || patient.status === 'indisponivel' || !plan || plan.ativo === false || (item.dataVencimento && item.dataVencimento < today)) return false;
      seen.add(key);
      return true;
    });
  },

  membersForPlan(planId: string): Array<{ patient: any; assignment: PlanAssignment }> {
    const patients = storageService.get<any[]>('pacientes', []);
    const byId = new Map(patients.map(item => [String(item.id), item]));
    return this.activeAssignments().filter(item => String(item.planoId) === String(planId)).map(assignment => ({ patient: byId.get(String(assignment.pacienteId)), assignment })).filter(item => Boolean(item.patient)).sort((a, b) => String(a.patient.nome).localeCompare(String(b.patient.nome), 'pt-BR'));
  },

  createPatient(patient: any, planId?: string, permission?: ModulePermission): { patient: any; assignment?: PlanAssignment; payment?: any } {
    assertPermission(permission, 'criar');
    const patients = storageService.get<any[]>('pacientes', []);
    const assignments = storageService.get<any[]>('planosAtribuidos', []);
    const payments = storageService.get<any[]>('pagamentos', []);
    const original = { patients, assignments, payments };

    if (patients.some(item => String(item.cpf || '').replace(/\D/g, '') === String(patient.cpf || '').replace(/\D/g, ''))) {
      throw new Error('Já existe um paciente com este CPF.');
    }
    if (patients.some(item => String(item.email || '').trim().toLowerCase() === String(patient.email || '').trim().toLowerCase())) {
      throw new Error('Já existe um paciente com este e-mail.');
    }

    let plan: StoredPlan | undefined;
    if (planId) {
      plan = this.activePlans().find(item => String(item.id) === String(planId));
      if (!plan) throw new Error('O plano selecionado não existe ou está inativo.');
      if (!Number.isFinite(Number(plan.quantidadeAulas)) || Number(plan.quantidadeAulas) <= 0) {
        throw new Error('O plano selecionado não possui uma quantidade de aulas válida. Edite o plano antes de vinculá-lo.');
      }
      if (assignments.some(item => String(item.pacienteId) === String(patient.id) && item.status === 'ativo')) {
        throw new Error('O paciente já possui um plano ativo.');
      }
    }

    const now = new Date();
    const assignment: PlanAssignment | undefined = plan ? {
      id: crypto.randomUUID(), pacienteId: patient.id, pacienteNome: patient.nome,
      planoId: plan.id, nomePlano: plan.nome, status: 'ativo',
      quantidadeAulas: Number(plan.quantidadeAulas), aulasRestantes: Number(plan.quantidadeAulas),
      dataInicio: now.toISOString().slice(0, 10),
      dataVencimento: addMonths(now, DURATION_MONTHS[plan.duracao]),
      createdAt: now.toISOString(), responsavel: 'Sistema',
    } : undefined;
    const persistedPatient = {
      ...patient,
      plano: plan?.nome || '', planoId: plan?.id || '',
      aulasRestantes: assignment?.aulasRestantes,
      planoValidoAte: assignment?.dataVencimento,
    };
    const payment = plan ? {
      id: crypto.randomUUID(), pacienteId: patient.id, pacienteNome: patient.nome,
      planoId: plan.id, plano: plan.nome, valor: Number(plan.preco), quantidadeAulas: Number(plan.quantidadeAulas),
      vencimento: now.toISOString().slice(0, 10), status: 'pendente',
      descricao: `Plano ${plan.nome}`, createdAt: now.toISOString(), responsavel: 'Sistema',
    } : undefined;

    try {
      const patientResult = storageService.set('pacientes', [...patients, persistedPatient]);
      if (!patientResult.ok) throw patientResult.error || new Error('Falha ao salvar o paciente.');
      if (assignment) {
        const assignmentResult = storageService.set('planosAtribuidos', [...assignments, assignment]);
        if (!assignmentResult.ok) throw assignmentResult.error || new Error('Falha ao vincular o plano.');
      }
      if (payment) {
        const paymentResult = storageService.set('pagamentos', [...payments, payment]);
        if (!paymentResult.ok) throw paymentResult.error || new Error('Falha ao criar a cobrança do plano.');
      }
      window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
      return { patient: persistedPatient, assignment, payment };
    } catch (error) {
      storageService.set('pacientes', original.patients);
      storageService.set('planosAtribuidos', original.assignments);
      storageService.set('pagamentos', original.payments);
      throw error;
    }
  },

  updatePatient(patient: any, planId: string | undefined, permission?: ModulePermission): { patient: any; assignment?: PlanAssignment } {
    assertPermission(permission, 'editar');
    const patients = storageService.get<any[]>('pacientes', []);
    const assignments = this.assignments();
    const payments = storageService.get<any[]>('pagamentos', []);
    const index = patients.findIndex(item => String(item.id) === String(patient.id));
    if (index < 0) throw new Error('Paciente não encontrado.');
    const original = { patients, assignments, payments };
    const current = assignments.find(item => String(item.pacienteId) === String(patient.id) && item.status === 'ativo');
    const requestedId = String(planId || '');
    const today = new Date().toISOString().slice(0, 10);
    const currentIsValid = Boolean(current && (!current.dataVencimento || current.dataVencimento >= today));
    if (requestedId && current && currentIsValid && String(current.planoId) === requestedId) {
      const updated = { ...patient, planoId: current.planoId, plano: current.nomePlano, aulasRestantes: current.aulasRestantes, planoValidoAte: current.dataVencimento };
      const nextPatients = patients.map(item => String(item.id) === String(patient.id) ? updated : item);
      const result = storageService.set('pacientes', nextPatients); if (!result.ok) throw result.error || new Error('Falha ao atualizar o paciente.');
      window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
      return { patient: updated, assignment: current };
    }
    const plan = requestedId ? this.activePlans().find(item => String(item.id) === requestedId) : undefined;
    if (requestedId && !plan) throw new Error('O plano selecionado não existe ou está inativo.');
    if (plan && (!Number.isFinite(Number(plan.quantidadeAulas)) || Number(plan.quantidadeAulas) <= 0)) throw new Error('O plano selecionado não possui uma quantidade de aulas válida.');
    const now = new Date();
    const closed = assignments.map(item => String(item.pacienteId) === String(patient.id) && item.status === 'ativo' ? { ...item, status: 'encerrado' as const, endedAt: now.toISOString() } : item);
    const assignment: PlanAssignment | undefined = plan ? { id: crypto.randomUUID(), pacienteId: String(patient.id), pacienteNome: patient.nome, planoId: plan.id, nomePlano: plan.nome, status:'ativo', quantidadeAulas:Number(plan.quantidadeAulas), aulasRestantes:Number(plan.quantidadeAulas), dataInicio:now.toISOString().slice(0,10), dataVencimento:addMonths(now,DURATION_MONTHS[plan.duracao]), createdAt:now.toISOString(), responsavel:'Sistema' } : undefined;
    const updated = { ...patient, planoId: plan?.id || '', plano: plan?.nome || '', aulasRestantes: assignment?.aulasRestantes, planoValidoAte: assignment?.dataVencimento };
    const nextPatients = patients.map(item => String(item.id) === String(patient.id) ? updated : item);
    const payment = plan ? { id:crypto.randomUUID(), pacienteId:patient.id, pacienteNome:patient.nome, planoId:plan.id, plano:plan.nome, valor:Number(plan.preco), quantidadeAulas:Number(plan.quantidadeAulas), vencimento:now.toISOString().slice(0,10), status:'pendente', descricao:`Plano ${plan.nome}`, createdAt:now.toISOString(), responsavel:'Sistema' } : undefined;
    try {
      const patientResult = storageService.set('pacientes', nextPatients); if (!patientResult.ok) throw patientResult.error;
      const assignmentResult = storageService.set('planosAtribuidos', assignment ? [...closed, assignment] : closed); if (!assignmentResult.ok) throw assignmentResult.error;
      if (payment) { const paymentResult = storageService.set('pagamentos', [...payments, payment]); if (!paymentResult.ok) throw paymentResult.error; }
      window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
      return { patient: updated, assignment };
    } catch (error) {
      storageService.set('pacientes', original.patients); storageService.set('planosAtribuidos', original.assignments); storageService.set('pagamentos', original.payments); throw error;
    }
  },

  endPatientEnrollment(patientId: string, status: 'encerrado' | 'cancelado' = 'encerrado'): void {
    const now = new Date().toISOString();
    storageService.set('planosAtribuidos', this.assignments().map(item => String(item.pacienteId) === String(patientId) && item.status === 'ativo' ? { ...item, status, endedAt: now } : item));
    window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
  },
};
