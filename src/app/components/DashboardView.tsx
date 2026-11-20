import { useEffect, useState } from 'react';
import { Users, Calendar, DollarSign, CreditCard, Clock, AlertCircle, Cake, ChevronRight } from 'lucide-react';
import { alertService, SmartAlert } from '../services/alertService';
import { readFinancialLedger } from '../services/financialLedger';

interface DashboardViewProps {
  isDark: boolean;
}

function parseLocalDate(value: string): Date {
  return new Date(value.includes('T') ? value : `${value}T12:00:00`);
}

function getAge(dataNasc: string): number {
  const hoje = new Date();
  const nasc = parseLocalDate(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function diasParaAniversario(dataNasc: string): number {
  const hoje = new Date();
  const nasc = parseLocalDate(dataNasc);
  const proxAniv = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
  if (proxAniv < hoje) proxAniv.setFullYear(hoje.getFullYear() + 1);
  return Math.round((proxAniv.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function readStoredArray(key: string): any[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function DashboardView({ isDark }: DashboardViewProps) {
  const P = isDark ? '#67C8CE' : '#087F8C';
  const bg = isDark ? '#0B1426' : '#F4F8FB';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';
  const muted = isDark ? '#111F35' : '#EEF6FA';
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>(() => alertService.calculate());

  useEffect(() => {
    const refresh = () => setSmartAlerts(alertService.calculate());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('storage', refresh);
    window.addEventListener('pilamanager:data-changed', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('pilamanager:data-changed', refresh);
    };
  }, []);

  // Ler dados reais do localStorage
  const pacientes = readStoredArray('pacientes');
  const agendamentos = readStoredArray('agendamentos').map(a => ({ ...a, data: a.data || a.date }));
  const pagamentos = readStoredArray('pagamentos');

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // KPIs
  const pacientesAtivos = pacientes.filter(p => p.status !== 'inativo').length;
  const atendimentosHoje = agendamentos.filter(a => (a.data === hojeStr || (!a.data && Number(a.day) === hoje.getDay())) && a.status !== 'cancelado').length;
  const proximosAgendamentos = agendamentos
    .filter(a => a.status !== 'cancelado' && (a.data || (Number.isInteger(Number(a.day)) && Number(a.day) >= 0 && Number(a.day) <= 6)))
    .map(a => {
      if (a.data) return { ...a, horario: a.horario || a.startTime, pacienteNome: a.pacienteNome || a.studentName, profissionalNome: a.profissionalNome || a.professor };
      const next = new Date(hoje);
      next.setHours(0, 0, 0, 0);
      next.setDate(next.getDate() + ((Number(a.day) - hoje.getDay() + 7) % 7));
      return { ...a, data: next.toISOString().slice(0, 10), horario: a.horario || a.startTime, pacienteNome: a.pacienteNome || a.studentName, profissionalNome: a.profissionalNome || a.professor };
    })
    .filter(a => new Date(`${a.data}T23:59:59`) >= hoje)
    .sort((a, b) => `${a.data}${a.horario || ''}`.localeCompare(`${b.data}${b.horario || ''}`))
    .slice(0, 5);
  const pagamentosPendentes = pagamentos.filter(p => p.status === 'pendente' || p.status === 'atrasado').length;
  const receitaMes = readFinancialLedger()
    .filter(p => { const d = new Date(p.data + 'T12:00:00'); return d.getMonth() === mesAtual && d.getFullYear() === anoAtual && p.tipo === 'receita'; })
    .reduce((s, p) => s + p.valor, 0);

  // Aniversariantes do mês (usando dataNascimento do cadastro)
  const anivMes = pacientes
    .filter(p => p.dataNascimento && parseLocalDate(p.dataNascimento).getMonth() === mesAtual)
    .map(p => ({ ...p, dia: parseLocalDate(p.dataNascimento).getDate(), idade: getAge(p.dataNascimento) + 1 }))
    .sort((a, b) => a.dia - b.dia);

  // Próximo aniversário (qualquer mês)
  const proxAniv = pacientes
    .filter(p => p.dataNascimento)
    .map(p => ({ ...p, dias: diasParaAniversario(p.dataNascimento) }))
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 3);


  const nomeDoMes = hoje.toLocaleDateString('pt-BR', { month: 'long' });

  const kpis = [
    { label: 'Pacientes Ativos', value: pacientesAtivos, icon: Users, color: P },
    { label: 'Atendimentos Hoje', value: atendimentosHoje, icon: Calendar, color: '#35A978' },
    { label: 'Receita do Mês', value: `R$ ${receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, icon: DollarSign, color: isDark ? '#8DD4D0' : '#087F76' },
    { label: 'Cobranças Pendentes', value: pagamentosPendentes, icon: CreditCard, color: '#E5A83B' },
  ];

  return (
    <div className="p-6" style={{ backgroundColor: bg }}>
      {/* Saudação */}
      <div className="pm-page-heading">
        <div><p className="pm-eyebrow">PAINEL DO ESTÚDIO</p><h2 style={{ color: textMain }}>Visão Geral</h2><p className="text-sm mt-2" style={{color:textSub}}>O que precisa da sua atenção, em um só lugar.</p></div>
        <p className="pm-date-label">{hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* KPIs */}
      <div className="pm-kpi-grid">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="pm-kpi" style={{'--metric-color':color} as React.CSSProperties}>
            <div className="pm-kpi-icon"><Icon size={26}/></div>
            <div className="pm-kpi-top"><span>{label}</span></div>
            <p className="pm-kpi-value">{value}</p><p className="pm-kpi-caption">{label==='Receita do Mês'?'Pagamentos recebidos':label==='Cobranças Pendentes'?'Acompanhar recebimentos':'Registros do estúdio'}</p>
          </div>
        ))}
      </div>

      {/* Grid principal */}
      <div className="pm-section-label"><span>Agenda & acompanhamento</span><span>Rotina do estúdio</span></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Próximos agendamentos */}
        <div className="lg:col-span-2 rounded-xl p-5 border" style={{ backgroundColor: card, borderColor: border }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: textMain, fontWeight: 600 }}>Próximos Agendamentos</h3>
            <Clock className="w-4 h-4" style={{ color: textSub }} />
          </div>
          <div className="space-y-2">
            {proximosAgendamentos.length === 0 && <p className="text-sm text-center py-4" style={{ color: textSub }}>Nenhum agendamento futuro.</p>}
            {proximosAgendamentos.map((a, i) => {
              const isHoje = a.data === hojeStr;
              const dataLabel = isHoje ? 'Hoje' : new Date(a.data + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border-l-2" style={{ backgroundColor: muted, borderLeftColor: isHoje ? P : border }}>
                  <div className="flex-shrink-0 text-center w-12">
                    <p className="font-bold" style={{ color: P, fontSize: '0.8rem' }}>{a.horario}</p>
                    <p style={{ color: textSub, fontSize: '0.65rem' }}>{dataLabel}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: textMain }}>{a.pacienteNome}</p>
                    <p className="truncate" style={{ color: textSub, fontSize: '0.7rem' }}>{a.profissionalNome}</p>
                  </div>
                  {isHoje && <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${P}15`, color: P }}>hoje</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas inteligentes */}
        <div className="rounded-xl p-5 border" style={{ backgroundColor: card, borderColor: border }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4" style={{ color: '#E5A83B' }} />
            <h3 style={{ color: textMain, fontWeight: 600 }}>Alertas Inteligentes</h3>
          </div>
          <div className="space-y-2">
            {smartAlerts.length === 0 && <p className="text-sm text-center py-4" style={{ color: textSub }}>Nenhum alerta no momento.</p>}
            {smartAlerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="p-3 rounded-xl" style={{ backgroundColor: muted }}>
                <p className="text-sm font-medium truncate" style={{ color: alert.type === 'danger' ? '#D95C5C' : alert.type === 'warning' ? '#E5A83B' : P }}>{alert.title}</p>
                <p className="truncate" style={{ color: textSub, fontSize: '0.7rem' }}>{alert.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Aniversariantes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aniversariantes do mês */}
        <div className="rounded-xl p-5 border" style={{ backgroundColor: card, borderColor: border }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(229,168,59,0.15)' }}>
              <Cake className="w-3.5 h-3.5" style={{ color: '#E5A83B' }} />
            </div>
            <h3 style={{ color: textMain, fontWeight: 600 }}>Aniversariantes de {nomeDoMes.charAt(0).toUpperCase() + nomeDoMes.slice(1)}</h3>
          </div>
          {anivMes.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: textSub }}>Nenhum aniversariante este mês.</p>
          ) : (
            <div className="space-y-2">
              {anivMes.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: muted }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(229,168,59,0.2)' }}>
                    <Cake className="w-3.5 h-3.5" style={{ color: '#E5A83B' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: textMain }}>{p.nome}</p>
                    <p style={{ color: textSub, fontSize: '0.7rem' }}>Dia {p.dia}{p.idade ? ` · ${p.idade} anos` : ''}</p>
                  </div>
                  {p.dia === hoje.getDate() && (
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(229,168,59,0.15)', color: '#E5A83B' }}>Hoje!</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos aniversários */}
        <div className="rounded-xl p-5 border" style={{ backgroundColor: card, borderColor: border }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${P}15` }}>
              <Cake className="w-3.5 h-3.5" style={{ color: P }} />
            </div>
            <h3 style={{ color: textMain, fontWeight: 600 }}>Próximos Aniversários</h3>
          </div>
          <div className="space-y-2">
            {proxAniv.length === 0 && <p className="text-sm text-center py-4" style={{ color: textSub }}>Nenhum aniversário cadastrado.</p>}
            {proxAniv.map((p: any, i: number) => {
              const dataAniv = p.dataNascimento ? parseLocalDate(p.dataNascimento) : null;
              const proxData = dataAniv ? new Date(anoAtual, dataAniv.getMonth(), dataAniv.getDate()) : null;
              if (proxData && proxData < hoje) proxData?.setFullYear(anoAtual + 1);
              const label = proxData?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) || '';
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: muted }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${P}15` }}>
                    <span className="font-bold" style={{ color: P, fontSize: '0.7rem' }}>{p.dias ?? '–'}d</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: textMain }}>{p.nome}</p>
                    <p style={{ color: textSub, fontSize: '0.7rem' }}>{label}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textSub }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
