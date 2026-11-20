import { ModulePermission } from '../utils/permissions';
import { readFinancialLedger, summarizeFinancialEntries } from '../services/financialLedger';
import { formatCalendarDate } from '../utils/calendarDate';
import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Download, Filter, FileText, Receipt, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { exportarRelatorioFinanceiroPDF, exportarReciboPagamentoPDF } from '../utils/pdfExport';

interface FinanceiroViewProps {
  perms?: ModulePermission;
  isDark: boolean;
}

export function FinanceiroView({ isDark, perms }: FinanceiroViewProps) {
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receitas' | 'despesas'>('todos');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRecibosModal, setShowRecibosModal] = useState(false);
  const [pagamentosSelecionados, setPagamentosSelecionados] = useState<string[]>([]);
  const [gerandoRecibos, setGerandoRecibos] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setDataVersion(value => value + 1);
    window.addEventListener('pilamanager:data-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('pilamanager:data-changed', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const { dadosMensais, transacoes } = useMemo(() => {
    const normalized = readFinancialLedger();
    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthly = months.map((mes, month) => {
      const items = normalized.filter(item => { const date = new Date(`${item.data}T12:00:00`); return !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear && date.getMonth() === month; });
      return { mes, receitas: items.filter(item => item.tipo === 'receita').reduce((sum, item) => sum + item.valor, 0), despesas: items.filter(item => item.tipo === 'despesa').reduce((sum, item) => sum + item.valor, 0) };
    });
    return { dadosMensais: monthly, transacoes: normalized.sort((a, b) => b.data.localeCompare(a.data)) };
  }, [dataVersion]);

  const pagamentosRecebidos = useMemo(() => {
    let source: any[] = [];
    try { source = JSON.parse(localStorage.getItem('pagamentos') || '[]'); } catch { source = []; }
    return source.filter(item => String(item.status || '').toLowerCase() === 'pago').map((item, index) => ({
      ...item,
      id: String(item.id ?? `pagamento-${index}`),
      pacienteNome: String(item.pacienteNome || item.aluno || item.paciente || ''),
      plano: String(item.plano || item.nomePlano || ''),
      valor: Number(item.valor ?? item.total ?? 0),
      formaPagamento: String(item.formaPagamento || item.metodoPagamento || item.meioPagamento || ''),
      dataPagamento: String(item.dataPagamento || item.data || item.createdAt || '').slice(0, 10),
      responsavel: String(item.responsavel || item.recebidoPor || 'Sistema'),
      observacoes: String(item.observacoes || item.descricao || ''),
    }));
  }, [dataVersion]);

  const totalReceitas = dadosMensais.reduce((acc, item) => acc + item.receitas, 0);
  const totalDespesas = dadosMensais.reduce((acc, item) => acc + item.despesas, 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const margemLucro = totalReceitas ? ((lucroLiquido / totalReceitas) * 100).toFixed(1) : '0.0';

  const currentMonth = new Date().getMonth();
  const receitasMesAtual = dadosMensais[currentMonth]?.receitas || 0;
  const despesasMesAtual = dadosMensais[currentMonth]?.despesas || 0;

  const transacoesFiltradas = transacoes.filter(t => {
    if (filtroTipo === 'todos') return true;
    return t.tipo === filtroTipo.slice(0, -1); // remove 's' do final
  });

  const P = isDark ? '#67C8CE' : '#087F8C';
  const bg = isDark ? '#0B1426' : '#F4F8FB';
  const card = isDark ? '#182B43' : '#ffffff';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSecondary = isDark ? '#AFBFD3' : '#687E98';
  const mutedBg = isDark ? '#111F35' : '#EEF6FA';

  const handleExportarRelatorioCompleto = () => {
    if (!transacoesFiltradas.length) { alert('Nao existem transacoes para gerar o relatorio.'); return; }
    const resumo = summarizeFinancialEntries(transacoesFiltradas);
    exportarRelatorioFinanceiroPDF({
      mes: `Histórico - ${filtroTipo === 'todos' ? 'movimentações' : filtroTipo}`,
      ...resumo,
      transacoes: transacoesFiltradas
    });
    setShowExportModal(false);
  };

  const handleAbrirRecibosIndividuais = () => {
    setShowExportModal(false);
    setShowRecibosModal(true);
    setPagamentosSelecionados([]);
  };

  const handleTogglePagamento = (id: string) => {
    setPagamentosSelecionados(prev => {
      if (prev.includes(id)) {
        return prev.filter(paymentId => paymentId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleGerarRecibosSelecionados = async () => {
    if (gerandoRecibos) return;
    const selecionados = pagamentosRecebidos.filter(item => pagamentosSelecionados.includes(item.id));
    if (!selecionados.length) { alert('Selecione ao menos um pagamento recebido.'); return; }
    setGerandoRecibos(true);
    try {
      for (const pagamento of selecionados) await exportarReciboPagamentoPDF(pagamento);
      setShowRecibosModal(false);
      setPagamentosSelecionados([]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível gerar o recibo.');
    } finally {
      setGerandoRecibos(false);
    }
  };

  // Custom tooltip para recharts com paleta correta
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl shadow-lg p-3" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
          <p className="text-xs font-bold mb-2" style={{ color: textMain }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: R$ {entry.value.toLocaleString('pt-BR')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 min-h-full w-full max-w-full overflow-x-hidden max-sm:p-4" style={{ backgroundColor: bg }}>
      {/* Header compacto */}
      <div className="flex items-center justify-between mb-6 gap-3 max-sm:flex-col max-sm:items-stretch">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight" style={{ color: textMain }}>Financeiro</h1>
          <p className="text-sm mt-0.5" style={{ color: textSecondary }}>
            Gestão financeira e fluxo de caixa — {new Date().getFullYear()}
          </p>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:shadow-md max-sm:justify-center"
          style={{ borderColor: border, color: P, backgroundColor: card }}
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* 4 KPI cards redesenhados */}
      <div className="pm-kpi-grid">
        {[
          {
            label: 'Receitas (Mês)',
            value: receitasMesAtual.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
            sub: new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),
            icon: TrendingUp,
            color: '#35A978',
            trend: ''
          },
          {
            label: 'Despesas (Mês)',
            value: despesasMesAtual.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
            sub: new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),
            icon: TrendingDown,
            color: '#D95C5C',
            trend: ''
          },
          {
            label: 'Lucro Líquido (Ano)',
            value: lucroLiquido.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
            sub: `Total ${new Date().getFullYear()}`,
            icon: DollarSign,
            color: P,
            trend: ''
          },
          {
            label: 'Margem de Lucro',
            value: `${margemLucro}%`,
            sub: 'Média anual',
            icon: TrendingUp,
            color: '#E5A83B',
            trend: ''
          }
        ].map((stat, i) => {
          const Icon = stat.icon;
          // Margem de lucro: mostre sinal positivo verde explícito
          const isMargin = stat.label === 'Margem de Lucro';
          const displayValue = stat.value;
          const displayColor = isMargin ? (Number(margemLucro)<0?'#D95C5C':'#35A978') : stat.color;
          return (
            <div key={i} className="pm-kpi" style={{ '--metric-color': displayColor } as React.CSSProperties}>
              <div className="pm-kpi-icon"><Icon size={26}/></div>
              <p className="pm-kpi-top">{stat.label}</p>
              <p className="pm-kpi-value">{displayValue}</p>
              <p className="pm-kpi-caption">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Receitas vs Despesas */}
        <div className="rounded-xl p-5 min-w-0 max-sm:p-4" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
          <div className="mb-4">
            <h3 className="text-sm font-bold" style={{ color: textMain }}>Receitas vs Despesas</h3>
            <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{new Date().getFullYear()}</p>
          </div>
          <div className="finance-chart">
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={dadosMensais} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke={border} />
              <XAxis key="x-axis" dataKey="mes" stroke={textSecondary} interval={1} minTickGap={12} tick={{ fontSize: 10, fill: textSecondary }} />
              <YAxis key="y-axis" stroke={textSecondary} width={42} tick={{ fontSize: 10, fill: textSecondary }} />
              <Tooltip key="tooltip" content={<CustomTooltip />} />
              <Legend key="legend" wrapperStyle={{ fontSize: '11px', color: textSecondary, paddingTop: '8px' }} />
              <Line key="line-receitas" type="monotone" dataKey="receitas" stroke="#35A978" strokeWidth={2.5} name="Receitas" dot={false} />
              <Line key="line-despesas" type="monotone" dataKey="despesas" stroke="#D95C5C" strokeWidth={2.5} name="Despesas" dot={false} />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Lucro Mensal */}
        <div className="rounded-xl p-5 min-w-0 max-sm:p-4" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
          <div className="mb-4">
            <h3 className="text-sm font-bold" style={{ color: textMain }}>Lucro Mensal</h3>
            <p className="text-xs mt-0.5" style={{ color: textSecondary }}>Resultado líquido por mês em 2026</p>
          </div>
          <div className="finance-chart">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={dadosMensais.map(item => ({ mes: item.mes, lucro: item.receitas - item.despesas }))} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke={border} />
              <XAxis key="x-axis" dataKey="mes" stroke={textSecondary} interval={1} minTickGap={12} tick={{ fontSize: 10, fill: textSecondary }} />
              <YAxis key="y-axis" stroke={textSecondary} width={42} tick={{ fontSize: 10, fill: textSecondary }} />
              <Tooltip key="tooltip" content={<CustomTooltip />} />
              <Bar key="bar-lucro" dataKey="lucro" fill={P} radius={[4, 4, 0, 0]} name="Lucro" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transações Recentes */}
      <div className="rounded-xl overflow-hidden max-w-full" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b flex-wrap" style={{ borderColor: border }}>
          <div>
            <h3 className="text-sm font-bold" style={{ color: textMain }}>Transações Recentes</h3>
            <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{transacoesFiltradas.length} lançamentos</p>
          </div>
          {/* Filtros em pills responsivos */}
          <div className="flex rounded-xl overflow-hidden border flex-shrink-0" style={{ borderColor: border, backgroundColor: mutedBg }}>
            {(['todos', 'receitas', 'despesas'] as const).map(tipo => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className="px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: filtroTipo === tipo ? P : 'transparent',
                  color: filtroTipo === tipo ? '#fff' : textSecondary
                }}
              >
                {tipo === 'todos' ? 'Todos' : tipo === 'receitas' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: mutedBg }}>
                <th className="text-left py-2.5 px-5 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Tipo</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Data</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Descrição</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Categoria</th>
                <th className="text-right py-2.5 px-5 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map((t, idx) => (
                <tr key={t.id} className="border-t transition-colors" style={{ borderColor: border, backgroundColor: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
                  <td className="py-3 px-5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: t.tipo === 'receita' ? 'rgba(53,169,120,0.15)' : 'rgba(217,92,92,0.15)'
                      }}
                    >
                      {t.tipo === 'receita'
                        ? <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#35A978' }} />
                        : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: '#D95C5C' }} />
                      }
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs" style={{ color: textSecondary }}>
                    {formatCalendarDate(t.data)}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium" style={{ color: textMain }}>
                    {t.descricao}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                      backgroundColor: t.tipo === 'receita' ? 'rgba(53,169,120,0.1)' : 'rgba(217,92,92,0.1)',
                      color: t.tipo === 'receita' ? '#35A978' : '#D95C5C'
                    }}>
                      {t.categoria}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right whitespace-nowrap">
                    <span className="text-sm font-bold" style={{ color: t.tipo === 'receita' ? '#35A978' : '#D95C5C' }}>
                      {t.tipo === 'receita' ? '+' : '−'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Exportação */}
      {showExportModal && (
        <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="pm-panel rounded-2xl shadow-xl w-full max-w-md" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
            <div className="pm-panel-header flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${P}18` }}>
                  <FileText className="w-4 h-4" style={{ color: P }} />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: textMain }}>Exportar Relatórios</h3>
                  <p className="text-xs" style={{ color: textSecondary }}>Selecione o tipo de exportação</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: textSecondary, backgroundColor: mutedBg }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-2">
              {/* Relatório Completo PDF */}
              <button
                onClick={handleExportarRelatorioCompleto}
                className="w-full flex items-center gap-4 p-3.5 rounded-xl border transition-all hover:shadow-md active:scale-[0.99]"
                style={{ borderColor: border, backgroundColor: mutedBg }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(217,92,92,0.1)' }}>
                  <FileText className="w-4 h-4" style={{ color: '#D95C5C' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm" style={{ color: textMain }}>
                    Relatório Completo PDF
                  </p>
                  <p className="text-xs" style={{ color: textSecondary }}>
                    Movimentações exibidas e seus totais
                  </p>
                </div>
                <Download className="w-4 h-4 flex-shrink-0" style={{ color: '#D95C5C' }} />
              </button>

              {/* Recibos Individuais */}
              <button
                onClick={handleAbrirRecibosIndividuais}
                className="w-full flex items-center gap-4 p-3.5 rounded-xl border transition-all hover:shadow-md active:scale-[0.99]"
                style={{ borderColor: border, backgroundColor: mutedBg }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${P}15` }}>
                  <Receipt className="w-4 h-4" style={{ color: P }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm" style={{ color: textMain }}>
                    Recibos Individuais
                  </p>
                  <p className="text-xs" style={{ color: textSecondary }}>
                    PDF por pagamento recebido
                  </p>
                </div>
                <Download className="w-4 h-4 flex-shrink-0" style={{ color: P }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Recibos Individuais */}
      {showRecibosModal && (
        <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="pm-panel rounded-2xl shadow-xl w-full max-w-md" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
            <div className="pm-panel-header px-5 py-4 border-b" style={{ borderColor: border }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${P}18` }}>
                    <Receipt className="w-4 h-4" style={{ color: P }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: textMain }}>Selecionar Pagamentos</h3>
                    <p className="text-xs" style={{ color: textSecondary }}>
                      Selecione para gerar recibos individuais
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRecibosModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                  style={{ color: textSecondary, backgroundColor: mutedBg }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto">
              {pagamentosRecebidos.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: textSecondary }}>
                  Nenhum pagamento recebido com dados para recibo
                </p>
              ) : (
                <div className="space-y-2">
                  {pagamentosRecebidos.map(pagamento => (
                    <label
                      key={pagamento.id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                      style={{ backgroundColor: mutedBg }}
                    >
                      <input
                        type="checkbox"
                        checked={pagamentosSelecionados.includes(pagamento.id)}
                        onChange={() => handleTogglePagamento(pagamento.id)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: P }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm" style={{ color: textMain }}>
                          {pagamento.pacienteNome || 'Paciente não identificado'}
                        </p>
                        <p className="text-xs" style={{ color: textSecondary }}>
                          {pagamento.plano || 'Sem plano'} · R$ {pagamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · {pagamento.dataPagamento}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t" style={{ borderColor: border }}>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRecibosModal(false)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                  style={{ borderColor: border, color: textSecondary, backgroundColor: 'transparent' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGerarRecibosSelecionados}
                  disabled={pagamentosSelecionados.length === 0 || gerandoRecibos}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: pagamentosSelecionados.length === 0 ? border : P,
                    color: '#ffffff'
                  }}
                >
                  {gerandoRecibos ? 'Gerando...' : `Gerar ${pagamentosSelecionados.length > 0 ? `(${pagamentosSelecionados.length})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
