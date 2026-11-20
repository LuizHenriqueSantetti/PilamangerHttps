import { professionalService } from './professionalService';
import { readFinancialLedger } from './financialLedger';

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

export function getReportData(startValue: string, endValue: string, colors: string[]) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T23:59:59`);
  const inPeriod = (value?: string) => {
    if (!value) return true;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date >= start && date <= end;
  };
  const allPatients = read<any[]>('pacientes', []);
  const patients = allPatients.filter(item => inPeriod(item.dataCadastro));
  const appointments = read<any[]>('agendamentos', []).filter(item => inPeriod(item.data || item.date));
  const payments: any[] = readFinancialLedger().filter(item => inPeriod(item.data + 'T12:00:00'));
  const plans = read<any[]>('planosAtribuidos', []);
  const classes = read<any[]>('detalheAulasPagamento', []).filter(item => inPeriod(item.data));
  const professionals = professionalService.list({ includeInactive: true });
  const valueOf = (item: any) => Number(item.valor ?? item.value ?? item.total ?? 0);
  const isIncome = (item: any) => ['receita', 'pago', 'recebido'].includes(String(item.tipo || item.status || '').toLowerCase());
  const isExpense = (item: any) => ['despesa', 'saida'].includes(String(item.tipo || '').toLowerCase());
  const income = payments.filter(isIncome);
  const expenses = payments.filter(isExpense);
  const receitaTotal = income.reduce((sum, item) => sum + valueOf(item), 0);
  const despesaTotal = expenses.reduce((sum, item) => sum + valueOf(item), 0);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const receitaMensal = months.map((mes, month) => {
    const items = payments.filter(item => new Date(item.data + 'T12:00:00').getMonth() === month);
    const receita = items.filter(isIncome).reduce((sum, item) => sum + valueOf(item), 0);
    const despesa = items.filter(isExpense).reduce((sum, item) => sum + valueOf(item), 0);
    return { mes, receita, despesa, lucro: receita - despesa };
  });
  const expenseMap = new Map<string, number>();
  expenses.forEach(item => { const key = item.categoria || 'Outros'; expenseMap.set(key, (expenseMap.get(key) || 0) + valueOf(item)); });
  const despesasCategorias = [...expenseMap].map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }));
  const planMap = new Map<string, number>();
  plans.forEach(item => { const key = item.nomePlano || item.plano || 'Sem plano'; planMap.set(key, (planMap.get(key) || 0) + 1); });
  const planoDistribuicao = [...planMap].map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }));
  const professoresData = professionals.map(item => {
    const professionalClasses = classes.filter(entry => entry.fisioterapeuta === item.nome || String(entry.profissionalId || '') === item.id);
    return { nome: item.nome, aulas: professionalClasses.length, receita: professionalClasses.reduce((sum, entry) => sum + Number(entry.valorAula || 0), 0), satisfacao: item.avaliacao || 0 };
  });
  const matriculasMensais = months.map((mes, month) => ({
    mes,
    novos: patients.filter(item => new Date(item.dataCadastro).getMonth() === month).length,
    cancelamentos: allPatients.filter(item => item.status !== 'ativo' && item.historicoStatus?.some((history: any) => new Date(history.data).getMonth() === month)).length,
    ativos: allPatients.filter(item => item.status === 'ativo' && new Date(item.dataCadastro) <= new Date(start.getFullYear(), month + 1, 0)).length,
  }));
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const ocupacaoDiaSemana = dayNames.map((dia, day) => {
    const items = appointments.filter(item => Number(item.day ?? new Date(item.data || item.date).getDay()) === day);
    const cancelados = items.filter(item => ['cancelado', 'falta'].includes(String(item.status).toLowerCase())).length;
    const aulas = items.length - cancelados;
    return { dia, ocupacao: items.length ? Math.round((aulas / items.length) * 100) : 0, aulas, cancelados };
  });
  const statusAgendamentos = [
    { name: 'Confirmado', value: appointments.filter(item => item.status === 'confirmado').length, color: '#35A978' },
    { name: 'Pendente', value: appointments.filter(item => item.status === 'pendente').length, color: '#E5A83B' },
    { name: 'Cancelado', value: appointments.filter(item => ['cancelado', 'falta'].includes(item.status)).length, color: '#D95C5C' },
  ];
  const activePatients = allPatients.filter(item => item.status === 'ativo').length;
  const confirmed = appointments.filter(item => item.status === 'confirmado').length;
  return {
    dadosGerais: { totalAlunos: allPatients.length, alunosAtivos: activePatients, alunosNovos: patients.length, taxaRetencao: allPatients.length ? activePatients / allPatients.length * 100 : 0, receitaTotal, receitaMensal: receitaTotal / 12, despesaTotal, lucroLiquido: receitaTotal - despesaTotal, totalProfessores: professionals.length, professoresAtivos: professionals.filter(item => item.status === 'ativo').length, aulasRealizadas: confirmed, taxaOcupacao: appointments.length ? confirmed / appointments.length * 100 : 0 },
    receitaMensal, despesasCategorias, matriculasMensais, planoDistribuicao, professoresData, ocupacaoDiaSemana, statusAgendamentos,
    hasAnyData: Boolean(allPatients.length || appointments.length || payments.length || plans.length || professionals.length),
  };
}

