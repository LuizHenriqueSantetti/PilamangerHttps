import { savePdfDocument } from '../utils/pdfDelivery';
import { ModulePermission } from '../utils/permissions';
import { useMemo, useState } from 'react';
import {
  Download, Calendar, Users, DollarSign,
  TrendingUp, BarChart3, Award,
  Eye, XCircle, CreditCard
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { getReportData } from '../services/reportDataService';
import { formatCalendarDate } from '../utils/calendarDate';

interface RelatoriosViewProps {
  perms?: ModulePermission;
  isDark: boolean;
}

export function RelatoriosView({ isDark, perms }: RelatoriosViewProps) {
  const P = isDark ? '#67C8CE' : '#087F8C';
  const bg = isDark ? '#0B1426' : '#F4F8FB';
  const card = isDark ? '#182B43' : '#ffffff';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const muted = isDark ? '#111F35' : '#EEF6FA';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';

  const [tipoRelatorio, setTipoRelatorio] = useState<string>('geral');
  const [periodoInicio, setPeriodoInicio] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [periodoFim, setPeriodoFim] = useState(() => new Date().toISOString().slice(0, 10));
  const liveData = useMemo(() => getReportData(periodoInicio, periodoFim, [P, '#35A978', '#E5A83B', textSub, '#076A76', '#2E7D5B']), [periodoInicio, periodoFim, P, textSub]);

  // ─── Categorias da sidebar ───────────────────────────────────────────────────
  const categorias = [
    { id: 'geral',        label: 'Geral',         icon: BarChart3,   count: 'Resumo', color: P },
    { id: 'alunos',       label: 'Pacientes',      icon: Users,       count: `${liveData.dadosGerais.totalAlunos} registros`, color: '#35A978' },
    { id: 'agendamentos', label: 'Agendamentos',   icon: Calendar,    count: `${liveData.dadosGerais.aulasRealizadas} aulas`, color: P },
    { id: 'faltas',       label: 'Faltas',         icon: XCircle,     count: `${liveData.ocupacaoDiaSemana.reduce((sum, item) => sum + item.cancelados, 0)} faltas`, color: '#E5A83B' },
    { id: 'professores',  label: 'Comissões',      icon: Award,       count: `${liveData.dadosGerais.totalProfessores} profissionais`, color: P },
    { id: 'financeiro',   label: 'Receitas',       icon: TrendingUp,  count: liveData.dadosGerais.receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: '#35A978' },
    { id: 'despesas',     label: 'Despesas',       icon: DollarSign,  count: liveData.dadosGerais.despesaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: '#D95C5C' },
    { id: 'comissoes',    label: 'Planos',         icon: CreditCard,  count: `${liveData.planoDistribuicao.length} planos`, color: P },
  ];

  // Dados consolidados a partir do armazenamento persistente.
  const dadosGerais = liveData.dadosGerais;

  const receitaMensal = liveData.receitaMensal;

  const despesasCategorias = liveData.despesasCategorias;

  const matriculasMensais = liveData.matriculasMensais;

  const planoDistribuicao = liveData.planoDistribuicao;

  const professoresData = liveData.professoresData;

  const ocupacaoDiaSemana = liveData.ocupacaoDiaSemana;

  const statusAgendamentos = liveData.statusAgendamentos;

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value)) return '0%';
    return `${value.toFixed(1).replace('.0', '')}%`;
  };

  const profitMargin = dadosGerais.receitaTotal > 0
    ? (dadosGerais.lucroLiquido / dadosGerais.receitaTotal) * 100
    : 0;

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const tooltipStyle = {
    backgroundColor: card,
    border: `1px solid ${border}`,
    borderRadius: '8px',
    color: textMain,
    fontSize: '12px'
  };

  const clinicIdentity = (() => { try { const data = JSON.parse(localStorage.getItem('academiaData') || '{}'); return { name: data.nomeExibicao || data.nome || 'PilaManager Studio', logo: String(data.logo || '') }; } catch { return { name: 'PilaManager Studio', logo: '' }; } })();
  const drawReportHeader = (doc: jsPDF) => {
    const title = `Relatorio de ${categorias.find(item => item.id === tipoRelatorio)?.label || 'Geral'}`;
    const period = `${formatCalendarDate(periodoInicio)} a ${formatCalendarDate(periodoFim)}`;
    doc.setFillColor(3, 140, 140); doc.rect(0, 0, 210, 28, 'F');
    let x = 14;
    if (clinicIdentity.logo.startsWith('data:image/')) { try { const image = doc.getImageProperties(clinicIdentity.logo); const scale = Math.min(14 / image.width, 14 / image.height); const width = image.width * scale; const height = image.height * scale; doc.addImage(clinicIdentity.logo, image.fileType, 14, 6, width, height); x += width + 4; } catch { x = 14; } }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(clinicIdentity.name, x, 10, { maxWidth: 105 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(title, x, 17, { maxWidth: 110 }); doc.text(`Periodo: ${period}`, x, 23, { maxWidth: 110 });
    doc.text(new Date().toLocaleString('pt-BR'), 196, 17, { align: 'right' });
  };

  const finalizarPDF = (doc: jsPDF) => {
    const total = doc.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
      doc.setPage(page);
      doc.setDrawColor(215, 232, 230);
      doc.line(14, 283, 196, 283);
      doc.setFontSize(8);
      doc.setTextColor(96, 123, 121);
      doc.text(`${clinicIdentity.name} - Documento confidencial`, 14, 289);
      doc.text(`Pagina ${page} de ${total}`, 196, 289, { align: 'right' });
    }
  };

  const tableOptions = {
    theme: 'grid' as const,
    margin: { top: 50, right: 14, bottom: 20, left: 14 },
    pageBreak: 'auto' as const,
    rowPageBreak: 'avoid' as const,
    showHead: 'everyPage' as const,
    styles: { fontSize: 8, cellPadding: 2.4, overflow: 'linebreak' as const, valign: 'middle' as const },
    didDrawPage: (data: any) => drawReportHeader(data.doc),
  };

  // ─── PDF export (mantido idêntico ao original) ───────────────────────────────
  const gerarRelatorio = () => {
    const hasData = tipoRelatorio === 'financeiro' ? receitaMensal.some(item => item.receita || item.despesa)
      : tipoRelatorio === 'despesas' ? despesasCategorias.length > 0
      : tipoRelatorio === 'alunos' ? dadosGerais.totalAlunos > 0
      : tipoRelatorio === 'professores' ? professoresData.length > 0
      : tipoRelatorio === 'comissoes' ? planoDistribuicao.length > 0
      : tipoRelatorio === 'faltas' ? ocupacaoDiaSemana.some(item => item.cancelados > 0)
      : tipoRelatorio === 'agendamentos' ? ocupacaoDiaSemana.some(item => item.aulas > 0 || item.cancelados > 0)
      : liveData.hasAnyData;
    if (!hasData) { alert('Nao existem dados no periodo selecionado para gerar este relatorio.'); return; }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    drawReportHeader(doc);

    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const periodo = `${formatCalendarDate(periodoInicio)} a ${formatCalendarDate(periodoFim)}`;

    switch (tipoRelatorio) {
      case 'geral': {
        doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Relatório Geral', 14, 32);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodo}`, 14, 40); doc.text(`Gerado em: ${dataAtual}`, 14, 46);
        let y = 55;
        doc.setFontSize(12); doc.setTextColor(3, 140, 140); doc.setFont('helvetica', 'bold'); doc.text('ALUNOS', 14, y); y += 8;
        doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
        doc.text(`Total de Alunos: ${dadosGerais.totalAlunos}`, 14, y); y += 6;
        doc.text(`Alunos Ativos: ${dadosGerais.alunosAtivos}`, 14, y); y += 6;
        doc.text(`Alunos Novos: ${dadosGerais.alunosNovos}`, 14, y); y += 6;
        doc.text(`Taxa de Retenção: ${dadosGerais.taxaRetencao}%`, 14, y); y += 12;
        doc.setFontSize(12); doc.setTextColor(53, 169, 120); doc.setFont('helvetica', 'bold'); doc.text('FINANCEIRO', 14, y); y += 8;
        doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
        doc.text(`Receita Total: R$ ${dadosGerais.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, y); y += 6;
        doc.text(`Despesa Total: R$ ${dadosGerais.despesaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, y); y += 6;
        doc.text(`Lucro Líquido: R$ ${dadosGerais.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, y); y += 12;
        doc.setFontSize(12); doc.setTextColor(2, 115, 115); doc.setFont('helvetica', 'bold'); doc.text('EQUIPE', 14, y); y += 8;
        doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
        doc.text(`Professores Ativos: ${dadosGerais.professoresAtivos}/${dadosGerais.totalProfessores}`, 14, y); y += 6;
        doc.text(`Aulas Realizadas: ${dadosGerais.aulasRealizadas}`, 14, y); y += 6;
        doc.text(`Taxa de Ocupação: ${dadosGerais.taxaOcupacao}%`, 14, y);
        finalizarPDF(doc);
        savePdfDocument(doc, `relatorio-geral-${dataAtual}.pdf`);
        break;
      }
      case 'financeiro': {
        doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Relatório Financeiro', 14, 32);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodo}`, 14, 40); doc.text(`Gerado em: ${dataAtual}`, 14, 46);
        autoTable(doc, {
          startY: 55,
          head: [['Mês', 'Receita', 'Despesa', 'Lucro', 'Margem']],
          body: receitaMensal.map(m => [m.mes, `R$ ${m.receita.toLocaleString('pt-BR')}`, `R$ ${m.despesa.toLocaleString('pt-BR')}`, `R$ ${m.lucro.toLocaleString('pt-BR')}`, `${(m.receita ? (m.lucro / m.receita) * 100 : 0).toFixed(1)}%`]),
          headStyles: { fillColor: [53, 169, 120], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          ...tableOptions,
          margin: { top: 50, left: 14, right: 14, bottom: 20 }
        });
        finalizarPDF(doc);
        savePdfDocument(doc, `relatorio-financeiro-${dataAtual}.pdf`);
        break;
      }
      case 'despesas': {
        doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Relatório de Despesas', 14, 32);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodo}`, 14, 40); doc.text(`Gerado em: ${dataAtual}`, 14, 46);
        autoTable(doc, {
          startY: 55,
          head: [['Categoria', 'Valor', 'Participação']],
          body: despesasCategorias.map(d => [
            d.name,
            `R$ ${d.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `${((d.value / dadosGerais.despesaTotal) * 100).toFixed(1)}%`
          ]),
          foot: [[
            'Total',
            `R$ ${despesasCategorias.reduce((acc, d) => acc + d.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            '100%'
          ]],
          headStyles: { fillColor: [217, 92, 92], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [236, 247, 245], textColor: [22, 60, 60], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          ...tableOptions,
          margin: { top: 50, left: 14, right: 14, bottom: 20 }
        });
        finalizarPDF(doc);
        savePdfDocument(doc, `relatorio-despesas-${dataAtual}.pdf`);
        break;
      }
      case 'alunos': {
        doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Relatório de Alunos', 14, 32);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodo}`, 14, 40); doc.text(`Gerado em: ${dataAtual}`, 14, 46);
        autoTable(doc, {
          startY: 55,
          head: [['Mês', 'Novos Alunos', 'Cancelamentos', 'Total Ativos']],
          body: matriculasMensais.map(m => [m.mes, m.novos.toString(), m.cancelamentos.toString(), m.ativos.toString()]),
          headStyles: { fillColor: [3, 140, 140], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          ...tableOptions,
          margin: { top: 50, left: 14, right: 14, bottom: 20 }
        });
        finalizarPDF(doc);
        savePdfDocument(doc, `relatorio-alunos-${dataAtual}.pdf`);
        break;
      }
      case 'professores': {
        doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Relatório de Professores', 14, 32);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodo}`, 14, 40); doc.text(`Gerado em: ${dataAtual}`, 14, 46);
        autoTable(doc, {
          startY: 55,
          head: [['Professor', 'Aulas', 'Receita Gerada', 'Avaliação']],
          body: professoresData.map(p => [p.nome, p.aulas.toString(), `R$ ${p.receita.toLocaleString('pt-BR')}`, `${p.satisfacao}/5.0`]),
          headStyles: { fillColor: [2, 115, 115], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          ...tableOptions,
          margin: { top: 50, left: 14, right: 14, bottom: 20 }
        });
        finalizarPDF(doc);
        savePdfDocument(doc, `relatorio-professores-${dataAtual}.pdf`);
        break;
      }
      case 'comissoes': {
        doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Relatório de Planos', 14, 32);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodo}`, 14, 40); doc.text(`Gerado em: ${dataAtual}`, 14, 46);
        autoTable(doc, {
          startY: 55,
          head: [['Plano', 'Alunos', 'Participação']],
          body: planoDistribuicao.map(p => [
            p.name,
            p.value.toString(),
            `${((p.value / dadosGerais.totalAlunos) * 100).toFixed(1)}%`
          ]),
          foot: [['Total', planoDistribuicao.reduce((acc, p) => acc + p.value, 0).toString(), '100%']],
          headStyles: { fillColor: [3, 140, 140], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [236, 247, 245], textColor: [22, 60, 60], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          ...tableOptions,
          margin: { top: 50, left: 14, right: 14, bottom: 20 }
        });
        finalizarPDF(doc);
        savePdfDocument(doc, `relatorio-planos-${dataAtual}.pdf`);
        break;
      }
      case 'agendamentos': {
        doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Relatório de Agendamentos', 14, 32);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodo}`, 14, 40); doc.text(`Gerado em: ${dataAtual}`, 14, 46);
        autoTable(doc, {
          startY: 55,
          head: [['Dia', 'Ocupação (%)', 'Aulas Realizadas', 'Cancelamentos']],
          body: ocupacaoDiaSemana.map(d => [d.dia, `${d.ocupacao}%`, d.aulas.toString(), d.cancelados.toString()]),
          headStyles: { fillColor: [3, 140, 140], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          ...tableOptions,
          margin: { top: 50, left: 14, right: 14, bottom: 20 }
        });
        finalizarPDF(doc);
        savePdfDocument(doc, `relatorio-agendamentos-${dataAtual}.pdf`);
        break;
      }
      case 'faltas': {
        doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('Relatório de Faltas', 14, 32);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${periodo}`, 14, 40); doc.text(`Gerado em: ${dataAtual}`, 14, 46);
        const totalAulas = ocupacaoDiaSemana.reduce((acc, d) => acc + d.aulas, 0);
        const totalFaltas = ocupacaoDiaSemana.reduce((acc, d) => acc + d.cancelados, 0);
        autoTable(doc, {
          startY: 55,
          head: [['Dia', 'Aulas Realizadas', 'Faltas/Cancelamentos', 'Taxa de Ausência']],
          body: ocupacaoDiaSemana.map(d => [
            d.dia,
            d.aulas.toString(),
            d.cancelados.toString(),
            `${((d.cancelados / Math.max(d.aulas + d.cancelados, 1)) * 100).toFixed(1)}%`
          ]),
          foot: [[
            'Total',
            totalAulas.toString(),
            totalFaltas.toString(),
            `${((totalFaltas / Math.max(totalAulas + totalFaltas, 1)) * 100).toFixed(1)}%`
          ]],
          headStyles: { fillColor: [229, 168, 59], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [236, 247, 245], textColor: [22, 60, 60], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          ...tableOptions,
          margin: { top: 50, left: 14, right: 14, bottom: 20 }
        });
        finalizarPDF(doc);
        savePdfDocument(doc, `relatorio-faltas-${dataAtual}.pdf`);
        break;
      }
      default:
        alert('Selecione um tipo de relatório');
    }
  };

  // ─── Sub-components ───────────────────────────────────────────────────────────
  const KpiRow = ({ items }: { items: { label: string; value: string; sub?: string; color: string }[] }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {items.map(item => (
        <div key={item.label} className="rounded-xl p-3" style={{ backgroundColor: muted }}>
          <p className="text-xs mb-1" style={{ color: textSub }}>{item.label}</p>
          <p className="report-kpi-value text-lg font-black leading-tight" style={{ color: item.color }}>{item.value}</p>
          {item.sub && <p className="text-xs mt-1" style={{ color: textSub }}>{item.sub}</p>}
        </div>
      ))}
    </div>
  );

  // ─── Preview por relatório ────────────────────────────────────────────────────
  const renderPreview = () => {
    const catAtiva = categorias.find(c => c.id === tipoRelatorio);
    const periodo = `${formatCalendarDate(periodoInicio)} – ${formatCalendarDate(periodoFim)}`;

    const PreviewWrapper = ({ children }: { children: React.ReactNode }) => (
      <div className="flex-1 min-w-0 w-full max-w-full overflow-hidden">
        {/* Cabeçalho do preview */}
        <div className="rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3 max-sm:flex-col max-sm:items-stretch"
          style={{ backgroundColor: card, border: `1px solid ${border}` }}>
          <div className="flex min-w-0 items-center gap-3">
            {catAtiva && (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${catAtiva.color}18` }}>
                <catAtiva.icon className="w-4.5 h-4.5" style={{ color: catAtiva.color, width: 18, height: 18 }} />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm" style={{ color: textMain }}>{catAtiva?.label}</p>
              <p className="text-xs break-words" style={{ color: textSub }}>Período: {periodo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 max-sm:w-full">
            <button
              onClick={gerarRelatorio}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-semibold text-sm shadow-sm transition-all hover:opacity-90 max-sm:w-full max-sm:justify-center"
              style={{ backgroundColor: P }}
            >
              <Download className="w-3.5 h-3.5" />
              Exportar PDF
            </button>
          </div>
        </div>
        {children}
      </div>
    );

    switch (tipoRelatorio) {
      case 'geral':
        return (
          <PreviewWrapper>
            <div className="rounded-xl p-5" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
              <KpiRow items={[
                { label: 'Total de Alunos',   value: String(dadosGerais.totalAlunos),       sub: `↑ ${dadosGerais.alunosNovos} novos`, color: P },
                { label: 'Taxa de Retenção',  value: formatPercent(dadosGerais.taxaRetencao), sub: 'Média anual',                      color: '#35A978' },
                { label: 'Receita Total',     value: `R$ ${(dadosGerais.receitaTotal / 1000).toFixed(0)}k`, sub: `R$ ${(dadosGerais.receitaMensal / 1000).toFixed(1)}k/mês`, color: P },
                { label: 'Lucro Líquido',     value: `R$ ${(dadosGerais.lucroLiquido / 1000).toFixed(0)}k`, sub: `Margem ${formatPercent(profitMargin)}`, color: '#35A978' },
              ]} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Indicadores de Equipe</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Professores Ativos', value: `${dadosGerais.professoresAtivos}/${dadosGerais.totalProfessores}` },
                      { label: 'Aulas Realizadas',   value: String(dadosGerais.aulasRealizadas) },
                      { label: 'Taxa de Ocupação',   value: `${dadosGerais.taxaOcupacao}%` },
                      { label: 'Alunos Ativos',      value: String(dadosGerais.alunosAtivos) },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center px-3 py-2.5 rounded-lg" style={{ backgroundColor: muted }}>
                        <span className="text-sm" style={{ color: textSub }}>{item.label}</span>
                        <span className="font-semibold text-sm" style={{ color: P }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Resumo Financeiro (6 meses)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={receitaMensal.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke={border} />
                      <XAxis dataKey="mes" tick={{ fill: textSub, fontSize: 11 }} />
                      <YAxis tick={{ fill: textSub, fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                      <Bar dataKey="receita" fill={P} radius={[3, 3, 0, 0]} name="Receita" />
                      <Bar dataKey="lucro" fill="#35A978" radius={[3, 3, 0, 0]} name="Lucro" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </PreviewWrapper>
        );

      case 'financeiro':
      case 'despesas':
        return (
          <PreviewWrapper>
            <div className="rounded-xl p-5" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
              <KpiRow items={[
                { label: 'Receita Total',  value: `R$ ${(dadosGerais.receitaTotal / 1000).toFixed(0)}k`, color: '#35A978' },
                { label: 'Despesas',       value: `R$ ${(dadosGerais.despesaTotal / 1000).toFixed(0)}k`, color: '#D95C5C' },
                { label: 'Lucro Líquido', value: `R$ ${(dadosGerais.lucroLiquido / 1000).toFixed(0)}k`, color: P },
                { label: 'Margem',        value: formatPercent(profitMargin), color: '#E5A83B' },
              ]} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Receita vs Despesa (Anual)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={receitaMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke={border} />
                      <XAxis dataKey="mes" tick={{ fill: textSub, fontSize: 11 }} />
                      <YAxis tick={{ fill: textSub, fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                      <Legend wrapperStyle={{ color: textSub, fontSize: '11px' }} />
                      <Area type="monotone" dataKey="receita" stroke="#35A978" fill="rgba(53,169,120,0.18)" name="Receita" />
                      <Area type="monotone" dataKey="despesa" stroke="#D95C5C" fill="rgba(217,92,92,0.12)" name="Despesa" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Distribuição de Despesas</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={despesasCategorias} dataKey="value" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderCustomizedLabel}>
                        {despesasCategorias.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                      <Legend wrapperStyle={{ color: textSub, fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Lucro Mensal</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={receitaMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke={border} />
                    <XAxis dataKey="mes" tick={{ fill: textSub, fontSize: 11 }} />
                    <YAxis tick={{ fill: textSub, fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Lucro']} />
                    <Bar dataKey="lucro" fill={P} radius={[4, 4, 0, 0]} name="Lucro" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </PreviewWrapper>
        );

      case 'alunos':
        return (
          <PreviewWrapper>
            <div className="rounded-xl p-5" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
              <KpiRow items={[
                { label: 'Total de Alunos',  value: String(dadosGerais.totalAlunos),  color: P },
                { label: 'Ativos',           value: String(dadosGerais.alunosAtivos), sub: `${formatPercent(dadosGerais.totalAlunos > 0 ? (dadosGerais.alunosAtivos / dadosGerais.totalAlunos) * 100 : 0)} do total`, color: '#35A978' },
                { label: 'Novos no Período', value: String(dadosGerais.alunosNovos),  color: P },
                { label: 'Taxa de Retenção', value: formatPercent(dadosGerais.taxaRetencao), color: '#35A978' },
              ]} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Evolução de Matrículas</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={matriculasMensais}>
                      <CartesianGrid strokeDasharray="3 3" stroke={border} />
                      <XAxis dataKey="mes" tick={{ fill: textSub, fontSize: 11 }} />
                      <YAxis tick={{ fill: textSub, fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: textSub, fontSize: '11px' }} />
                      <Line type="monotone" dataKey="ativos" stroke={P} strokeWidth={2} dot={{ fill: P, r: 3 }} name="Total Ativos" />
                      <Line type="monotone" dataKey="novos" stroke="#35A978" strokeWidth={2} dot={{ fill: '#35A978', r: 3 }} name="Novos" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Distribuição por Plano</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={planoDistribuicao} dataKey="value" cx="50%" cy="50%" outerRadius={85} labelLine={false} label={renderCustomizedLabel}>
                        {planoDistribuicao.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} alunos`, '']} />
                      <Legend wrapperStyle={{ color: textSub, fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Entradas vs Cancelamentos</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={matriculasMensais}>
                    <CartesianGrid strokeDasharray="3 3" stroke={border} />
                    <XAxis dataKey="mes" tick={{ fill: textSub, fontSize: 11 }} />
                    <YAxis tick={{ fill: textSub, fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="novos" fill="#35A978" radius={[3, 3, 0, 0]} name="Novos" />
                    <Bar dataKey="cancelamentos" fill="#D95C5C" radius={[3, 3, 0, 0]} name="Cancelamentos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </PreviewWrapper>
        );

      case 'professores':
      case 'comissoes':
        return (
          <PreviewWrapper>
            <div className="rounded-xl p-5" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
              <KpiRow items={[
                { label: 'Total Professores', value: String(dadosGerais.totalProfessores), color: P },
                { label: 'Ativos',            value: String(dadosGerais.professoresAtivos), color: '#35A978' },
                { label: 'Total de Aulas',    value: String(dadosGerais.aulasRealizadas),   color: P },
                { label: 'Média/Professor',   value: String(Math.round(dadosGerais.aulasRealizadas / dadosGerais.professoresAtivos)), sub: 'aulas/mês', color: '#35A978' },
              ]} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Aulas por Professor</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={professoresData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={border} horizontal={false} />
                      <XAxis type="number" tick={{ fill: textSub, fontSize: 10 }} />
                      <YAxis dataKey="nome" type="category" tick={{ fill: textSub, fontSize: 11 }} width={75} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} aulas`, '']} />
                      <Bar dataKey="aulas" fill={P} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Receita por Professor</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={professoresData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={border} horizontal={false} />
                      <XAxis type="number" tick={{ fill: textSub, fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                      <YAxis dataKey="nome" type="category" tick={{ fill: textSub, fontSize: 11 }} width={75} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                      <Bar dataKey="receita" fill="#35A978" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Detalhes por Professor</p>
                <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${border}` }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: muted }}>
                        {['Professor', 'Aulas', 'Receita Gerada', 'Avaliação'].map(h => (
                          <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSub }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {professoresData.map((p, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: border, backgroundColor: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
                          <td className="py-2.5 px-4 font-medium" style={{ color: textMain }}>{p.nome}</td>
                          <td className="py-2.5 px-4 font-semibold" style={{ color: P }}>{p.aulas}</td>
                          <td className="py-2.5 px-4 font-semibold" style={{ color: '#35A978' }}>R$ {p.receita.toLocaleString('pt-BR')}</td>
                          <td className="py-2.5 px-4">
                            <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#E5A83B' }}>★ {p.satisfacao}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </PreviewWrapper>
        );

      case 'agendamentos':
      case 'faltas':
        return (
          <PreviewWrapper>
            <div className="rounded-xl p-5" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
              <KpiRow items={[
                { label: 'Aulas Realizadas', value: String(dadosGerais.aulasRealizadas),  color: P },
                { label: 'Taxa de Ocupação', value: `${dadosGerais.taxaOcupacao}%`,       color: '#35A978' },
                { label: 'Confirmados',      value: '2.840',  sub: '87,6% do total',      color: '#35A978' },
                { label: 'Cancelamentos',    value: '120',    sub: '3,7% do total',        color: '#D95C5C' },
              ]} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Ocupação por Dia da Semana</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ocupacaoDiaSemana}>
                      <CartesianGrid strokeDasharray="3 3" stroke={border} />
                      <XAxis dataKey="dia" tick={{ fill: textSub, fontSize: 12 }} />
                      <YAxis tick={{ fill: textSub, fontSize: 10 }} unit="%" domain={[0, 100]} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Ocupação']} />
                      <Bar dataKey="ocupacao" radius={[4, 4, 0, 0]}>
                        {ocupacaoDiaSemana.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.ocupacao >= 90 ? '#35A978' : entry.ocupacao >= 75 ? P : '#E5A83B'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Status dos Agendamentos</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusAgendamentos} dataKey="value" cx="50%" cy="50%" outerRadius={85} labelLine={false} label={renderCustomizedLabel}>
                        {statusAgendamentos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} aulas`, '']} />
                      <Legend wrapperStyle={{ color: textSub, fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: textSub }}>Realizadas vs Cancelamentos</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={ocupacaoDiaSemana}>
                    <CartesianGrid strokeDasharray="3 3" stroke={border} />
                    <XAxis dataKey="dia" tick={{ fill: textSub, fontSize: 12 }} />
                    <YAxis tick={{ fill: textSub, fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="aulas" fill="#35A978" radius={[3, 3, 0, 0]} name="Realizadas" />
                    <Bar dataKey="cancelados" fill="#D95C5C" radius={[3, 3, 0, 0]} name="Cancelados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </PreviewWrapper>
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center rounded-2xl border" style={{ backgroundColor: card, borderColor: border, minHeight: 320 }}>
            <div className="text-center px-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: muted }}>
                <Eye className="w-6 h-6 opacity-40" style={{ color: P }} />
              </div>
              <p className="font-semibold" style={{ color: textMain }}>Selecione uma categoria</p>
              <p className="text-sm mt-1" style={{ color: textSub }}>Escolha uma categoria na lateral para visualizar o relatório</p>
            </div>
          </div>
        );
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-full w-full max-w-full flex-col overflow-x-hidden" style={{ backgroundColor: bg }}>
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 flex-wrap gap-3 max-sm:px-4"
        style={{ borderBottom: `1px solid ${border}`, backgroundColor: card }}>
        <div>
          <h2 className="text-xl font-bold leading-tight" style={{ color: textMain }}>Relatórios</h2>
          <p className="text-sm mt-0.5" style={{ color: textSub }}>Análises e exportações do sistema</p>
        </div>
        {/* Filtro de período no header */}
        <div className="flex min-w-0 items-center gap-2 flex-wrap max-sm:w-full">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: textSub }}>
            <Calendar className="w-3.5 h-3.5" style={{ color: P }} />
            <span>Período:</span>
          </div>
          <input
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            className="min-w-0 flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none"
            style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9', borderColor: border, color: textMain }}
          />
          <span className="text-xs" style={{ color: textSub }}>–</span>
          <input
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            className="min-w-0 flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none"
            style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9', borderColor: border, color: textMain }}
          />
        </div>
      </div>

      {/* Layout: sidebar + preview */}
      <div className="pm-report-layout">
        {/* Sidebar de categorias */}
        <nav className="pm-report-tabs" aria-label="Categorias">
          {categorias.map(cat => {
            const isActive = tipoRelatorio === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                aria-pressed={isActive}
                onClick={() => setTipoRelatorio(cat.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group max-md:min-w-0"
                style={{
                  backgroundColor: isActive ? P : 'transparent',
                  color: isActive ? '#ffffff' : textMain,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = isDark ? '#182B43' : '#EDF5F7'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${cat.color}18` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: isActive ? '#ffffff' : cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: isActive ? '#ffffff' : textMain }}>{cat.label}</p>
                  <p className="text-xs truncate" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : textSub }}>{cat.count}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Área de preview */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-5 flex flex-col gap-4 max-md:p-3">
          {renderPreview()}
        </main>
      </div>
    </div>
  );
}
