import { auditService } from './auditService';

export type PatientHistoryType = 'todos' | 'planos' | 'pagamentos' | 'faltas' | 'avaliacoes' | 'agendamentos' | 'alteracoes';

export interface PatientHistoryItem {
  id: string;
  type: Exclude<PatientHistoryType, 'todos'>;
  title: string;
  description: string;
  responsible: string;
  date: string;
}

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

export const patientHistoryService = {
  getPatientHistory(patient: any): PatientHistoryItem[] {
    const name = patient?.nome || patient?.name || patient?.pacienteNome || '';
    if (!name) return [];
    const items: PatientHistoryItem[] = [];

    read<any[]>('planosAtribuidos', [])
      .filter(item => item.pacienteNome === name || item.pacienteId === patient.id)
      .forEach(item => items.push({ id: `plano-${item.id || item.nomePlano}`, type: 'planos', title: item.nomePlano || 'Plano', description: item.status || 'Plano vinculado', responsible: item.responsavel || 'Sistema', date: item.createdAt || item.dataInicio || item.dataVencimento || new Date().toISOString() }));

    read<any[]>('pagamentos', [])
      .filter(item => item.pacienteNome === name || item.aluno === name || item.pacienteId === patient.id)
      .forEach(item => items.push({ id: `pagamento-${item.id || item.vencimento}`, type: 'pagamentos', title: `Pagamento ${item.status || ''}`.trim(), description: item.valor ? `R$ ${item.valor}` : 'Pagamento registrado', responsible: item.responsavel || 'Sistema', date: item.dataPagamento || item.vencimento || item.createdAt || new Date().toISOString() }));

    read<any[]>('agendamentos', [])
      .filter(item => item.pacienteNome === name || item.aluno === name || item.studentName === name || item.pacienteId === patient.id || item.studentId === patient.id)
      .forEach(item => {
        const status = String(item.status || '').toLowerCase();
        const weekday = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][Number(item.day)] || '';
        const time = item.horario || item.startTime || '';
        const professional = item.profissionalNome || item.professor || '';
        items.push({ id: `agenda-${item.id || item.data || item.day}`, type: status.includes('falta') || status.includes('cancel') ? 'faltas' : 'agendamentos', title: item.status || 'Agendamento', description: `${item.data || weekday} ${time}${professional ? ` - ${professional}` : ''}`.trim(), responsible: item.responsavel || professional || 'Sistema', date: item.data || item.createdAt || new Date().toISOString() });
      });

    auditService.list()
      .filter(entry => entry.module === 'Pacientes' && (entry.recordId === patient.id || JSON.stringify(entry.after || '').includes(name)))
      .forEach(entry => items.push({ id: entry.id, type: 'alteracoes', title: entry.action, description: 'Alteracao registrada em auditoria', responsible: entry.userName, date: entry.createdAt }));

    return items.sort((a, b) => b.date.localeCompare(a.date));
  },
};
