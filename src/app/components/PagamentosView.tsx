import { savePdfDocument } from '../utils/pdfDelivery';
import { maskCurrency, parseCurrency } from '../utils/masks';
import { notify, notifyError, performAction, confirmAction } from '../utils/notifications';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  Lock,
  Award,
  FileText,
  Download,
  X,
  AlertCircle,
  Check,
  Edit2,
  CreditCard,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { professionalService } from '../services/professionalService';
import { Professional } from '../types/professional';
import { auditService } from '../services/auditService';
import { ProfessionalFormModal } from './ProfessionalFormModal';
import { exportarReciboFisioterapeutaPDF } from '../utils/pdfExport';

interface PagamentosViewProps {
  isDark: boolean;
  userRole?: 'gerencia' | 'admin' | 'fisio' | 'recepcao';
  isManagerAuthenticated?: boolean;
  onRequestManagerAuth?: () => void;
}

type TipoComissao = 'fixa' | 'percentual' | 'hibrida';
type StatusPagamento = 'pago' | 'pendente' | 'atrasado';
type FiltroPeriodo = 'hoje' | 'semana' | 'mes' | 'personalizado';

export function PagamentosView({
  isDark,
  userRole = 'recepcao',
  isManagerAuthenticated = false,
  onRequestManagerAuth
}: PagamentosViewProps) {
  const isGerencia = userRole === 'gerencia' || isManagerAuthenticated;

  // Estados da aba Pagamento (comissões)
  const [periodo, setPeriodo] = useState<FiltroPeriodo>('mes');
  const [dataInicio, setDataInicio] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [periodoFechado, setPeriodoFechado] = useState(false);
  const [showRecibosModal, setShowRecibosModal] = useState(false);
  const [showEditComissaoModal, setShowEditComissaoModal] = useState(false);
  const [editingProfissional, setEditingProfissional] = useState<any>(null);

  // Dados de pagamento/comissões
  const [professionalRecords, setProfessionalRecords] = useState<Professional[]>([]);
  const [comissoesProfissionais, setComissoesProfissionais] = useState<any[]>([]);

  const [detalheAulas, setDetalheAulas] = useState(() => {
    const stored = localStorage.getItem('detalheAulasPagamento');
    if (stored) return JSON.parse(stored) as Array<{ id: number; data: string; paciente: string; fisioterapeuta: string; valorAula: number; comissao: number; status: StatusPagamento; atualizadoEm?: string; atualizadoPor?: string }>;
    return [];
  });

  useEffect(() => {
    const refresh = () => setDetalheAulas(JSON.parse(localStorage.getItem('detalheAulasPagamento') || '[]'));
    window.addEventListener('pilamanager:data-changed', refresh);
    return () => window.removeEventListener('pilamanager:data-changed', refresh);
  }, []);

  const parseLocalDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  const periodoRange = useMemo(() => {
    const latest = new Date();
    const start = new Date(latest);
    const end = new Date(latest);

    if (periodo === 'hoje') return { start, end };
    if (periodo === 'semana') {
      start.setDate(latest.getDate() - latest.getDay());
      end.setDate(start.getDate() + 6);
      return { start, end };
    }
    if (periodo === 'personalizado') {
      return { start: parseLocalDate(dataInicio), end: parseLocalDate(dataFim) };
    }
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
    return { start, end };
  }, [periodo, dataInicio, dataFim, detalheAulas]);

  const detalheAulasFiltradas = useMemo(() => detalheAulas.filter(aula => {
    const d = parseLocalDate(aula.data);
    return d >= periodoRange.start && d <= periodoRange.end;
  }), [detalheAulas, periodoRange]);

  const resumoFiltrado = useMemo(() => {
    const totalFaturado = detalheAulasFiltradas.reduce((acc, aula) => acc + aula.valorAula, 0);
    const totalPagoFisioterapeutas = detalheAulasFiltradas.filter(aula => aula.status === 'pago').reduce((acc, aula) => acc + aula.comissao, 0);
    const lucroClinica = totalFaturado - totalPagoFisioterapeutas;
    return {
      totalFaturado,
      totalPagoFisioterapeutas,
      lucroClinica,
      percentualMedioComissao: totalFaturado ? Math.round((totalPagoFisioterapeutas / totalFaturado) * 100) : 0,
    };
  }, [detalheAulasFiltradas]);

  useEffect(() => {
    const loadProfessionals = () => {
      const records = professionalService.list({ includeInactive: true });
      setProfessionalRecords(records);
      setComissoesProfissionais(records.map(record => {
        const classes = detalheAulasFiltradas.filter(item => item.fisioterapeuta === record.nome || String((item as any).profissionalId || '') === record.id);
        const numeroAulas = classes.length;
        const valorGerado = classes.reduce((sum, item) => sum + Number(item.valorAula || 0), 0);
        const percentual = record.comissaoPercentual;
        const valorFixo = record.valorFixoAula;
        const totalPercentual = valorGerado * (percentual / 100);
        const totalFixo = numeroAulas * valorFixo;
        const total = classes.reduce((sum, item) => sum + Number(item.comissao || 0), 0);
        return { id: record.id, nome: record.nome, numeroAulas, valorGerado, tipoComissao: record.tipoComissao, percentual, percentualH: percentual, valorFixo, valorMinimo: valorFixo, total };
      }));
    };
    loadProfessionals();
    window.addEventListener('pilamanager:professionals-updated', loadProfessionals);
    return () => window.removeEventListener('pilamanager:professionals-updated', loadProfessionals);
  }, [detalheAulasFiltradas]);

  const alterarStatusAula = async (id: number, status: StatusPagamento) => {
    if (!isGerencia) {
      onRequestManagerAuth?.();
      return;
    }
    notify('Para registrar pagamentos com segurança, utilize a aba Comissionamento. A alteração direta desta lista não é persistida no servidor.', 'warning');
  };

  const insights = useMemo(() => {
    const byRevenue = [...comissoesProfissionais].sort((a, b) => Number(b.valorGerado) - Number(a.valorGerado))[0];
    const byCommission = [...comissoesProfissionais].sort((a, b) => Number(b.total) - Number(a.total))[0];
    return {
      fisioterapeutaMaisReceita: { nome: byRevenue?.nome || 'Sem dados', valor: Number(byRevenue?.valorGerado || 0) },
      maiorComissao: { nome: byCommission?.nome || 'Sem dados', valor: Number(byCommission?.total || 0) },
      ticketMedio: detalheAulasFiltradas.length ? detalheAulasFiltradas.reduce((sum, item) => sum + Number(item.valorAula || 0), 0) / detalheAulasFiltradas.length : 0,
    };
  }, [comissoesProfissionais, detalheAulasFiltradas]);

  const [dadosBancariosAberto, setDadosBancariosAberto] = useState<string | null>(null);
  const [copiadoPix, setCopiadoPix] = useState<string | null>(null);
  const [bankEditing, setBankEditing] = useState<Professional | null>(null);

  const copiarTexto = (texto: string) => {
    void navigator.clipboard.writeText(texto).then(() => {
      setCopiadoPix(texto); notify('Informação copiada.', 'info');
      setTimeout(() => setCopiadoPix(null), 2000);
    }).catch(error => notifyError(error, 'Não foi possível copiar.'));
  };

  const gerarRecibo = (profId: string) => {
    const prof = comissoesProfissionais.find(item => String(item.id) === String(profId));
    if (!prof) return;
    const record = professionalService.get(String(prof.id));
    const aulas = detalheAulasFiltradas.filter(item => item.fisioterapeuta === prof.nome || String((item as any).profissionalId || '') === String(prof.id));
    exportarReciboFisioterapeutaPDF({
      nomeFisioterapeuta: prof.nome,
      cref: record?.registroProfissional || '',
      periodo: periodo === 'personalizado' ? `${dataInicio} a ${dataFim}` : ({ hoje: 'Hoje', semana: 'Esta Semana', mes: 'Este Mes' } as Record<string, string>)[periodo],
      atendimentos: aulas.length,
      valorPorAtendimento: aulas.length ? prof.total / aulas.length : 0,
      valorTotal: prof.total,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
    });
    setShowRecibosModal(false);
  };

  const gerarPDFCompletoSeguro = async () => {
    if (comissoesProfissionais.length === 0 && detalheAulasFiltradas.length === 0) { alert('Nao existem dados no periodo selecionado para gerar o relatorio.'); return; }
    const periodoLabel = periodo === 'personalizado'
      ? `${dataInicio} a ${dataFim}`
      : ({ hoje: 'Hoje', semana: 'Esta Semana', mes: 'Este Mês' } as Record<string, string>)[periodo];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 14;
    const pageW = 210;
    const pageH = 297;
    const clinic = (() => { try { const data = JSON.parse(localStorage.getItem('academiaData') || '{}'); return { name: data.nomeExibicao || data.nome || 'PilaManager Studio', logo: String(data.logo || '') }; } catch { return { name: 'PilaManager Studio', logo: '' }; } })();
    if (clinic.logo.startsWith('/api/images?key=')) {
      try {
        const response = await fetch(clinic.logo, { credentials: 'same-origin' });
        if (response.ok) {
          const blob = await response.blob();
          clinic.logo = await new Promise<string>((resolve,reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result)); reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch { /* Keep the clinic name if a logo is temporarily unavailable. */ }
    }

    const drawHeader = () => {
      doc.setFillColor(3, 140, 140);
      doc.rect(0, 0, pageW, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      let textX = margin;
      if (clinic.logo.startsWith('data:image/')) { try { const image = doc.getImageProperties(clinic.logo); const scale = Math.min(12 / image.width, 12 / image.height); const width = image.width * scale; const height = image.height * scale; doc.addImage(clinic.logo, image.fileType, margin, 5, width, height); textX += width + 4; } catch { textX = margin; } }
      doc.text(clinic.name, textX, 10, { maxWidth: 105 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Relatorio Completo de Comissoes', textX, 16);
      doc.text(`Periodo: ${periodoLabel}`, textX, 21);
      doc.text(new Date().toLocaleString('pt-BR'), pageW - margin, 16, { align: 'right' });
    };

    drawHeader();
    autoTable(doc, {
      startY: 34,
      body: [
        ['Total faturado', `R$ ${resumoFiltrado.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Pago fisioterapeutas', `R$ ${resumoFiltrado.totalPagoFisioterapeutas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Lucro da clínica', `R$ ${resumoFiltrado.lucroClinica.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['% médio comissão', `${resumoFiltrado.percentualMedioComissao}%`],
      ],
      theme: 'grid',
      margin: { top: 30, right: margin, bottom: 20, left: margin },
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right' } },
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY ?? 62) + 8,
      head: [['Profissional', 'Aulas', 'Valor gerado', 'Tipo', 'Total']],
      body: comissoesProfissionais.map(prof => [
        prof.nome,
        prof.numeroAulas,
        `R$ ${prof.valorGerado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        formatarTipoComissao(prof),
        `R$ ${prof.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      ]),
      theme: 'grid',
      showHead: 'everyPage',
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      margin: { top: 30, right: margin, bottom: 20, left: margin },
      headStyles: { fillColor: [3, 140, 140], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.4, overflow: 'linebreak', valign: 'middle' },
      columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' } },
      didDrawPage: drawHeader,
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY ?? 150) + 8,
      head: [['Data', 'Paciente', 'Fisioterapeuta', 'Valor aula', 'Comissão', 'Status']],
      body: detalheAulasFiltradas.map(aula => [
        new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR'),
        aula.paciente,
        aula.fisioterapeuta,
        `R$ ${aula.valorAula.toLocaleString('pt-BR')}`,
        `R$ ${aula.comissao.toLocaleString('pt-BR')}`,
        aula.status,
      ]),
      theme: 'grid',
      showHead: 'everyPage',
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      margin: { top: 30, right: margin, bottom: 20, left: margin },
      headStyles: { fillColor: [3, 140, 140], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.4, overflow: 'linebreak', valign: 'middle' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
      didDrawPage: drawHeader,
    });

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);
      doc.setDrawColor(215, 232, 230);
      doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
      doc.setFontSize(8);
      doc.setTextColor(96, 123, 121);
      doc.text(`${clinic.name} - Documento confidencial`, margin, pageH - 8);
      doc.text(`Página ${page} de ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
    }
    savePdfDocument(doc, `relatorio-comissoes-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleFecharPeriodo = async () => {
    if (!await confirmAction('Bloquear a edição deste período nesta sessão? Esse bloqueio visual não altera os pagamentos no servidor.')) return;
    setPeriodoFechado(true);
    notify('Edição do período bloqueada nesta sessão.', 'info');
  };

  const handleEditComissao = (prof: any) => {
    setEditingProfissional({ ...prof });
    setShowEditComissaoModal(true);
  };

  const handleSaveComissao = async () => {
    if (!editingProfissional) return;

    const percentage = Number(editingProfissional.tipoComissao === 'hibrida' ? editingProfissional.percentualH : editingProfissional.percentual);
    const fixedValue = Number(editingProfissional.tipoComissao === 'hibrida' ? editingProfissional.valorMinimo : editingProfissional.valorFixo);
    if (!Number.isFinite(percentage) || percentage < 0 ||
      percentage > 100 || !Number.isFinite(fixedValue) ||
      fixedValue < 0) { alert('Revise os valores da comissão.'); return; }
    // New rules affect future accruals only; recorded amounts remain unchanged.
    let novoTotal = 0;
    if (editingProfissional.tipoComissao === 'fixa') {
      novoTotal = editingProfissional.numeroAulas * editingProfissional.valorFixo;
    } else if (editingProfissional.tipoComissao === 'percentual') {
      novoTotal = editingProfissional.valorGerado * (editingProfissional.percentual / 100);
    } else if (editingProfissional.tipoComissao === 'hibrida') {
      const porcent = editingProfissional.valorGerado * (editingProfissional.percentualH / 100);
      const fixo = editingProfissional.numeroAulas * editingProfissional.valorMinimo;
      novoTotal = porcent + fixo;
    }

    const updated = { ...editingProfissional };
    const record = professionalService.get(String(updated.id));
    if (!record) { notify('Profissional não encontrado. Atualize a página.', 'warning'); return; }
    if (!await performAction('commission-rule', () => professionalService.save({
      ...record, tipoComissao: updated.tipoComissao, comissaoPercentual: percentage, valorFixoAula: fixedValue,
    }, record.id), 'Regra de comissão atualizada para os próximos lançamentos.')) return;
    setComissoesProfissionais(comissoesProfissionais.map(p => p.id === updated.id ? updated : p));
    setShowEditComissaoModal(false);
    setEditingProfissional(null);
  };

  const formatarTipoComissao = (profissional: any) => {
    if (profissional.tipoComissao === 'fixa') {
      return `R$ ${profissional.valorFixo}/aula`;
    } else if (profissional.tipoComissao === 'percentual') {
      return `${profissional.percentual}%`;
    } else {
      return `Mín. R$ ${profissional.valorMinimo} ou ${profissional.percentualH}%`;
    }
  };

  const getStatusBadge = (status: StatusPagamento) => {
    const configs = {
      pago: { bg: 'rgba(53,169,120,0.15)', color: '#35A978', label: 'Pago' },
      pendente: { bg: 'rgba(229,168,59,0.15)', color: '#E5A83B', label: 'Pendente' },
      atrasado: { bg: 'rgba(217,92,92,0.15)', color: '#D95C5C', label: 'Atrasado' }
    };
    const config = configs[status];
    return (
      <span
        className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: config.bg, color: config.color }}
      >
        {config.label}
      </span>
    );
  };

  const P = '#087F8C';
  const bg = isDark ? '#0B1426' : '#F4F8FB';
  const card = isDark ? '#182B43' : '#ffffff';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSecondary = isDark ? '#AFBFD3' : '#687E98';
  const mutedBg = isDark ? '#111F35' : '#EEF6FA';
  const inputBg = isDark ? '#0B1426' : '#F4F8FB';

  if (!isGerencia) {
    return (
      <div className="p-6 min-h-full" style={{ backgroundColor: bg }}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-xs">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(217,92,92,0.1)' }}>
              <AlertCircle className="w-7 h-7" style={{ color: '#D95C5C' }} />
            </div>
            <h3 className="text-base font-bold mb-1.5" style={{ color: textMain }}>Acesso Restrito</h3>
            <p className="text-sm mb-4" style={{ color: textSecondary }}>
              Esta seção é acessível apenas para contas de Gerência.
            </p>
            {onRequestManagerAuth && (
              <button
                onClick={onRequestManagerAuth}
                className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: '#D95C5C' }}
              >
                Desbloquear com Credenciais de Gerência
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full w-full max-w-full overflow-x-hidden max-sm:p-4" style={{ backgroundColor: bg }}>
      {/* Header compacto */}
      <div className="flex items-start justify-between mb-6 gap-3 max-sm:flex-col">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight" style={{ color: textMain }}>Detalhes do comissionamento</h1>
          <p className="text-sm mt-0.5" style={{ color: textSecondary }}>
            Gestão de comissões dos fisioterapeutas — informações sigilosas
          </p>
        </div>
        {/* Seletor de período compacto */}
        <div className="flex items-center gap-2 flex-wrap justify-end max-sm:w-full max-sm:justify-start">
          <div className="flex rounded-xl overflow-hidden border max-sm:grid max-sm:w-full max-sm:grid-cols-2" style={{ borderColor: border, backgroundColor: card }}>
            {(['hoje', 'semana', 'mes', 'personalizado'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className="px-3 py-2 text-xs font-semibold transition-colors capitalize max-sm:w-full"
                style={{
                  backgroundColor: periodo === p ? P : 'transparent',
                  color: periodo === p ? '#fff' : textSecondary
                }}
              >
                {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Período'}
              </button>
            ))}
          </div>
          {periodo === 'personalizado' && (
            <div className="flex gap-2 items-center max-sm:w-full max-sm:flex-col max-sm:items-stretch">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-2 rounded-lg border text-xs focus:outline-none"
                style={{ backgroundColor: card, borderColor: border, color: textMain }}
              />
              <span className="text-xs" style={{ color: textSecondary }}>até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-3 py-2 rounded-lg border text-xs focus:outline-none"
                style={{ backgroundColor: card, borderColor: border, color: textMain }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* Banner de Acesso Desbloqueado */}
        {isManagerAuthenticated && userRole !== 'gerencia' && (
          <div className="rounded-xl px-3 py-2.5 border flex items-center gap-2.5" style={{
            backgroundColor: 'rgba(53,169,120,0.07)',
            borderColor: 'rgba(53,169,120,0.2)'
          }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#35A978' }}>
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: '#35A978' }}>Acesso de Gerência Desbloqueado</p>
              <p className="text-xs leading-tight" style={{ color: textSecondary }}>
                Permissão temporária para informações sigilosas de pagamentos e comissões.
              </p>
            </div>
          </div>
        )}

        {/* KPI cards — 4 em linha, compactos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Faturado',        value: `R$ ${(resumoFiltrado.totalFaturado / 1000).toFixed(1)}k`,           icon: DollarSign, color: '#35A978' },
            { label: 'Pago Fisioterapeutas',  value: `R$ ${(resumoFiltrado.totalPagoFisioterapeutas / 1000).toFixed(1)}k`, icon: Users,      color: isDark ? '#AFBFD3' : '#62758A' },
            { label: 'Lucro da Clínica',      value: `R$ ${(resumoFiltrado.lucroClinica / 1000).toFixed(1)}k`,            icon: TrendingUp, color: P },
            { label: '% Médio Comissão',      value: `${resumoFiltrado.percentualMedioComissao}%`,                        icon: BarChart3,  color: '#E5A83B' }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${stat.color}18` }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs mt-0.5 leading-tight" style={{ color: isDark ? '#AFBFD3' : '#62758A' }}>{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabela de comissões por profissional */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: border }}>
            <div>
              <h4 className="text-sm font-bold" style={{ color: textMain }}>Comissão por Profissional</h4>
              <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{comissoesProfissionais.length} profissionais no período</p>
            </div>
          </div>
          <div className="commission-table-scroll overflow-x-auto">
            <table className="commission-table w-full">
              <thead>
                <tr style={{ backgroundColor: mutedBg }}>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Nome</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Aulas</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Val. Gerado</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Tipo</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Total</th>
                  {isGerencia && <th className="text-center py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {comissoesProfissionais.map((prof, idx) => (
                  <tr key={prof.id} className="border-t transition-colors hover:bg-opacity-50" style={{ borderColor: border, backgroundColor: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
                    <td className="commission-professional py-2.5 px-4" data-label="Profissional">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${P}, #076A76)` }}>
                          {prof.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                        </div>
                        <span className="text-sm font-medium" style={{ color: textMain }}>{prof.nome}</span>
                      </div>
                    </td>
                    <td className="text-center py-2.5 px-4" data-label="Aulas">
                      <span className="text-sm font-semibold" style={{ color: P }}>{prof.numeroAulas}</span>
                    </td>
                    <td className="text-right py-2.5 px-4 text-sm" data-label="Valor gerado" style={{ color: textSecondary }}>
                      R$ {prof.valorGerado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center py-2.5 px-4" data-label="Tipo de comissão">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                        backgroundColor: `${P}15`,
                        color: P
                      }}>
                        {formatarTipoComissao(prof)}
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-4 text-sm font-bold" data-label="Total" style={{ color: '#35A978' }}>
                      R$ {prof.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    {isGerencia && (
                      <td className="commission-actions text-center py-2.5 px-4" data-label="Ações">
                        <button
                          onClick={() => handleEditComissao(prof)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto"
                          style={{ backgroundColor: inputBg, color: P }}
                          title="Editar Comissão"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de detalhe de aulas */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: border }}>
            <h4 className="text-sm font-bold" style={{ color: textMain }}>Detalhamento por Aula</h4>
            <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{detalheAulasFiltradas.length} aulas no período selecionado</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: mutedBg }}>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Data</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Paciente</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Fisioterapeuta</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Valor Aula</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Comissão</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {detalheAulasFiltradas.map((aula, idx) => (
                  <tr key={aula.id} className="border-t transition-colors" style={{ borderColor: border, backgroundColor: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
                    <td className="py-2.5 px-4 text-xs" style={{ color: textSecondary }}>
                      {new Date(aula.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium" style={{ color: textMain }}>
                      {aula.paciente}
                    </td>
                    <td className="py-2.5 px-4 text-xs" style={{ color: P }}>
                      {aula.fisioterapeuta}
                    </td>
                    <td className="text-right py-2.5 px-4 text-xs" style={{ color: textSecondary }}>
                      R$ {aula.valorAula.toLocaleString('pt-BR')}
                    </td>
                    <td className="text-right py-2.5 px-4 text-xs font-semibold" style={{ color: '#35A978' }}>
                      R$ {aula.comissao.toLocaleString('pt-BR')}
                    </td>
                    <td className="text-center py-2.5 px-4">
                      {getStatusBadge(aula.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights e Relatórios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Destaques */}
          <div className="rounded-xl p-5" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${P}15` }}>
                <Award className="w-3.5 h-3.5" style={{ color: P }} />
              </div>
              <h4 className="text-sm font-bold" style={{ color: textMain }}>Destaques do Período</h4>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: mutedBg }}>
                <p className="text-xs mb-1" style={{ color: textSecondary }}>Maior Receita Gerada</p>
                <p className="text-sm font-bold" style={{ color: textMain }}>{insights.fisioterapeutaMaisReceita.nome}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: '#35A978' }}>
                  R$ {insights.fisioterapeutaMaisReceita.valor.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: mutedBg }}>
                <p className="text-xs mb-1" style={{ color: textSecondary }}>Maior Comissão do Período</p>
                <p className="text-sm font-bold" style={{ color: textMain }}>{insights.maiorComissao.nome}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: '#35A978' }}>
                  R$ {insights.maiorComissao.valor.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Exportar Relatórios */}
          <div className="rounded-xl p-5" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${P}15` }}>
                <FileText className="w-3.5 h-3.5" style={{ color: P }} />
              </div>
              <h4 className="text-sm font-bold" style={{ color: textMain }}>Exportar Relatórios</h4>
            </div>
            <div className="space-y-2">
              <button
                onClick={gerarPDFCompletoSeguro}
                className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all hover:shadow-md active:scale-[0.99]"
                style={{ backgroundColor: P, color: '#fff' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-white">Relatório Completo PDF</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Todas as comissões do período</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={() => setShowRecibosModal(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border transition-all hover:shadow-md active:scale-[0.99]"
                style={{ borderColor: border, backgroundColor: mutedBg }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${P}15` }}>
                    <FileText className="w-4 h-4" style={{ color: P }} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm" style={{ color: textMain }}>Recibos Individuais</p>
                    <p className="text-xs" style={{ color: textSecondary }}>PDF por fisioterapeuta</p>
                  </div>
                </div>
                <Download className="w-4 h-4" style={{ color: P }} />
              </button>
            </div>
          </div>
        </div>

        {/* Dados Bancários dos Professores */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: border }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${P}15` }}>
              <CreditCard className="w-3.5 h-3.5" style={{ color: P }} />
            </div>
            <h4 className="text-sm font-bold" style={{ color: textMain }}>Dados Bancários dos Professores</h4>
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(217,92,92,0.1)', color: '#D95C5C' }}>Confidencial</span>
          </div>
          <div className="divide-y" style={{ borderColor: border }}>
            {professionalRecords.map((prof) => {
              const commission = comissoesProfissionais.find(item => item.id === prof.id);
              const complete = Boolean(prof.dadosBancarios.banco && prof.dadosBancarios.agencia && prof.dadosBancarios.conta && prof.dadosBancarios.nomeTitular && prof.dadosBancarios.cpfTitular);
              return (
                <div key={prof.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${P}, #076A76)` }}>
                      {prof.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: textMain }}>{prof.nome}</p>
                      <p className="text-xs" style={{ color: textSecondary }}>{commission ? formatarTipoComissao(commission) : 'Comissao nao configurada'} · <span style={{ color: complete ? '#35A978' : '#E5A83B' }}>{complete ? 'Dados completos' : 'Cadastro bancario incompleto'}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!isGerencia) { onRequestManagerAuth?.(); return; }
                      const next = dadosBancariosAberto === prof.id ? null : prof.id;
                      setDadosBancariosAberto(next);
                      if (next) auditService.record({ action: 'Visualizou dados bancarios', actionType: 'security', module: 'Profissionais', recordId: prof.id });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: dadosBancariosAberto === prof.id ? `${P}18` : inputBg,
                      color: P,
                      border: `1px solid ${dadosBancariosAberto === prof.id ? P : border}`
                    }}
                  >
                    {dadosBancariosAberto === prof.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {dadosBancariosAberto === prof.id ? 'Ocultar' : 'Ver dados'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Modal Dados Bancários */}
      {isGerencia && dadosBancariosAberto !== null && professionalRecords.find(p => p.id === dadosBancariosAberto) && (
        <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div className="pm-panel w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
            <div className="pm-panel-header flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base" style={{ color: textMain }}>Dados Bancários</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(217,92,92,0.1)', color: '#D95C5C' }}>Confidencial</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                  {professionalRecords.find(p => p.id === dadosBancariosAberto)?.nome}
                </p>
              </div>
              <button onClick={() => setDadosBancariosAberto(null)} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: textSecondary, backgroundColor: mutedBg }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            {(() => {
              const professional = professionalRecords.find(item => item.id === dadosBancariosAberto);
              if (!professional) return null;
              const bancario = professional.dadosBancarios;
              const items = [
                { label: 'Banco', value: bancario.banco, mono: false, copy: false },
                { label: 'Agência', value: bancario.agencia, mono: true, copy: false },
                { label: 'Conta', value: `${bancario.conta}${bancario.digitoConta ? `-${bancario.digitoConta}` : ''}`, mono: true, copy: false },
                { label: 'Tipo de Conta', value: bancario.tipoConta, mono: false, copy: false },
                { label: 'CPF do titular', value: bancario.cpfTitular, mono: true, copy: false },
                { label: `Chave PIX (${bancario.tipoChavePix || 'não definida'})`, value: bancario.chavePix, mono: true, copy: true },
                { label: 'Método de Pagamento', value: professional.metodoPagamento, mono: false, copy: false },
              ];
              return (
                <div className="p-5 space-y-2">
                  {items.map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: mutedBg }}>
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: textSecondary }}>{item.label}</p>
                         <p className={`text-sm font-semibold${item.mono ? ' font-mono' : ''}`} style={{ color: textMain }}>{item.value || 'Não informado'}</p>
                      </div>
                      {item.copy && (
                        <button onClick={() => copiarTexto(item.value)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: copiadoPix === item.value ? '#35A978' : textSecondary, backgroundColor: card }}>
                          {copiadoPix === item.value ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-center pt-2" style={{ color: textSecondary }}>
                    Acesso restrito a gerência. Não compartilhe essas informações.
                  </p>
                  <button onClick={() => { setDadosBancariosAberto(null); setBankEditing(professional); }} className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: P }}>Editar dados bancários</button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Recibos Individuais */}
      {showRecibosModal && (
        <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="pm-panel w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
            <div className="pm-panel-header flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: textMain }}>Recibos Individuais</h3>
                <p className="text-xs mt-0.5" style={{ color: textSecondary }}>Selecione o fisioterapeuta para gerar o PDF</p>
              </div>
              <button onClick={() => setShowRecibosModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: textSecondary, backgroundColor: mutedBg }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {comissoesProfissionais.map(prof => (
                <button
                  key={prof.id}
                  onClick={() => gerarRecibo(prof.id)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border transition-all hover:shadow-md active:scale-[0.99]"
                  style={{ borderColor: border, backgroundColor: mutedBg }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${P}, #076A76)` }}>
                      {prof.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm" style={{ color: textMain }}>{prof.nome}</p>
                      <p className="text-xs" style={{ color: textSecondary }}>
                        {prof.numeroAulas} aulas · {formatarTipoComissao(prof)} ·{' '}
                        <span style={{ color: '#35A978' }}>R$ {prof.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 flex-shrink-0" style={{ color: P }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Comissão */}
      {showEditComissaoModal && editingProfissional && (
        <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="pm-panel w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
            <div className="pm-panel-header flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: textMain }}>Editar Comissão</h2>
                <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{editingProfissional.nome}</p>
              </div>
              <button
                onClick={() => { setShowEditComissaoModal(false); setEditingProfissional(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: textSecondary, backgroundColor: mutedBg }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>
                  Tipo de Comissão
                </label>
                <select
                  value={editingProfissional.tipoComissao}
                  onChange={(e) => setEditingProfissional({
                    ...editingProfissional,
                    tipoComissao: e.target.value as TipoComissao
                  })}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
                  style={{ backgroundColor: mutedBg, borderColor: border, color: textMain }}
                >
                  <option value="fixa">Fixa (por aula)</option>
                  <option value="percentual">Percentual (sobre valor gerado)</option>
                  <option value="hibrida">Híbrida (mínimo ou percentual)</option>
                </select>
              </div>

              {editingProfissional.tipoComissao === 'fixa' && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>
                    Valor Fixo por Aula (R$)
                  </label>
                  <input
                    type="text" inputMode="numeric"
                    value={maskCurrency(String(Math.round((editingProfissional.valorFixo || 0) * 100)))}
                    onChange={(e) => setEditingProfissional({ ...editingProfissional, valorFixo: parseCurrency(maskCurrency(e.target.value)) })}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
                    style={{ backgroundColor: mutedBg, borderColor: border, color: textMain }}
                    min="0"
                    step="10"
                  />
                </div>
              )}

              {editingProfissional.tipoComissao === 'percentual' && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>
                    Percentual (%)
                  </label>
                  <input
                    type="number"
                    value={editingProfissional.percentual || 0}
                    onChange={(e) => setEditingProfissional({ ...editingProfissional, percentual: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
                    style={{ backgroundColor: mutedBg, borderColor: border, color: textMain }}
                    min="0"
                    max="100"
                    step="5"
                  />
                </div>
              )}

              {editingProfissional.tipoComissao === 'hibrida' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>
                      Valor Mínimo por Aula (R$)
                    </label>
                    <input
                      type="text" inputMode="numeric"
                      value={maskCurrency(String(Math.round((editingProfissional.valorMinimo || 0) * 100)))}
                      onChange={(e) => setEditingProfissional({ ...editingProfissional, valorMinimo: parseCurrency(maskCurrency(e.target.value)) })}
                      className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
                      style={{ backgroundColor: mutedBg, borderColor: border, color: textMain }}
                      min="0"
                      step="10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>
                      Percentual (%)
                    </label>
                    <input
                      type="number"
                      value={editingProfissional.percentualH || 0}
                      onChange={(e) => setEditingProfissional({ ...editingProfissional, percentualH: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
                      style={{ backgroundColor: mutedBg, borderColor: border, color: textMain }}
                      min="0"
                      max="100"
                      step="5"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowEditComissaoModal(false); setEditingProfissional(null); }}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                  style={{ borderColor: border, color: textSecondary, backgroundColor: 'transparent' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveComissao}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: P }}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {bankEditing && (
        <ProfessionalFormModal
          isDark={isDark}
          professional={bankEditing}
          initialSection="bancario"
          onClose={() => setBankEditing(null)}
          onSaved={() => { setBankEditing(null); setProfessionalRecords(professionalService.list({ includeInactive: true })); }}
        />
      )}
    </div>
  );
}
