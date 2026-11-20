import { professionalService } from './professionalService';

export interface SmartAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  module: string;
}

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

function daysUntil(date: string) {
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export const alertService = {
  calculate(): SmartAlert[] {
    const alerts: SmartAlert[] = [];
    const planos = read<any[]>('planosAtribuidos', []);
    const persistedTransactions = read<any[]>('transacoesFinanceiras', []);
    const pagamentos = persistedTransactions.length ? persistedTransactions : read<any[]>('pagamentos', []);
    const agendamentos = read<any[]>('agendamentos', []);
    const profissionais = professionalService.list();

    planos.forEach(plano => {
      if (!plano.dataVencimento) return;
      const days = daysUntil(plano.dataVencimento);
      if (days < 0) alerts.push({ id: `plano-vencido-${plano.id || plano.pacienteNome}`, type: 'danger', title: 'Plano vencido', description: `${plano.pacienteNome || 'Paciente'} esta com plano vencido ha ${Math.abs(days)} dia(s).`, module: 'planos' });
      else if (days <= 7) alerts.push({ id: `plano-vencendo-${plano.id || plano.pacienteNome}`, type: 'warning', title: 'Plano proximo do vencimento', description: `${plano.pacienteNome || 'Paciente'} vence em ${days} dia(s).`, module: 'planos' });
    });

    pagamentos.forEach(pagamento => {
      const status = String(pagamento.status || '').toLowerCase();
      if (status === 'atrasado') alerts.push({ id: `pagamento-atrasado-${pagamento.id || pagamento.pacienteNome}`, type: 'danger', title: 'Pagamento atrasado', description: `${pagamento.pacienteNome || pagamento.aluno || 'Paciente'} possui pagamento atrasado.`, module: 'cobrancas' });
      if (status === 'pendente') alerts.push({ id: `cobranca-pendente-${pagamento.id || pagamento.pacienteNome}`, type: 'warning', title: 'Cobranca pendente', description: `${pagamento.pacienteNome || pagamento.aluno || 'Paciente'} possui cobranca pendente.`, module: 'cobrancas' });
    });

    const faltasPorPaciente = agendamentos.reduce<Record<string, number>>((acc, item) => {
      const status = String(item.status || '').toLowerCase();
      if (status.includes('falta') || status.includes('cancel')) {
        const name = item.pacienteNome || item.studentName || item.aluno || 'Paciente';
        acc[name] = (acc[name] || 0) + 1;
      }
      return acc;
    }, {});
    Object.entries(faltasPorPaciente).filter(([, count]) => count >= 3).forEach(([name, count]) => {
      alerts.push({ id: `faltas-${name}`, type: 'warning', title: 'Aluno com muitas faltas', description: `${name} possui ${count} faltas/cancelamentos registrados.`, module: 'agendamento' });
    });

    profissionais.filter(pro => pro.status === 'ativo' && Array.isArray(pro.horarios) && pro.horarios.length === 0).forEach(pro => {
      alerts.push({ id: `sem-disponibilidade-${pro.id || pro.nome}`, type: 'info', title: 'Profissional sem disponibilidade', description: `${pro.nome || 'Profissional'} esta sem disponibilidade cadastrada.`, module: 'equipe' });
    });

    const professionalSlots = new Set<string>();
    const roomSlots = new Set<string>();
    agendamentos.forEach(item => {
      if (String(item.status || '').toLowerCase() === 'cancelado') return;
      const date = item.data || `dia-${item.day}`;
      const time = item.horario || item.startTime;
      const professional = item.profissionalNome || item.professor;
      const room = item.sala || item.room;
      if (!date || !time) return;
      const professionalKey = professional ? `${date}-${time}-${professional}` : '';
      const roomKey = room ? `${date}-${time}-${room}` : '';
      if ((professionalKey && professionalSlots.has(professionalKey)) || (roomKey && roomSlots.has(roomKey))) {
        const key = professionalKey || roomKey;
        alerts.push({ id: `conflito-${key}`, type: 'danger', title: 'Agendamento conflitante', description: `Conflito em ${date} ${time}${professional ? ` com ${professional}` : ''}.`, module: 'agendamento' });
      }
      if (professionalKey) professionalSlots.add(professionalKey);
      if (roomKey) roomSlots.add(roomKey);
    });

    return alerts.slice(0, 20);
  },
};
