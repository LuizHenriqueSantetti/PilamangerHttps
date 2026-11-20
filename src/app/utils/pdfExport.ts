import { notify } from './notifications';
import { savePdfDocument } from './pdfDelivery';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCalendarDate } from './calendarDate';

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const PRIMARY: [number, number, number] = [3, 140, 140];
const TEXT: [number, number, number] = [31, 60, 60];
const MUTED: [number, number, number] = [96, 123, 121];
const documentHeaders = new WeakMap<jsPDF, { title: string; subtitle?: string }>();

function clinicIdentity() {
  try {
    const data = JSON.parse(localStorage.getItem('academiaData') || '{}');
    return { name: data.nomeExibicao || data.nome || 'PilaManager Studio', logo: String(data.logo || '') };
  } catch { return { name: 'PilaManager Studio', logo: '' }; }
}

function header(doc: jsPDF, title: string, subtitle?: string) {
  const clinic = clinicIdentity();
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_W, 24, 'F');
  let textX = MARGIN;
  if (clinic.logo.startsWith('data:image/')) {
    try {
      const properties = doc.getImageProperties(clinic.logo);
      const maxW = 14; const maxH = 14;
      const ratio = Math.min(maxW / properties.width, maxH / properties.height);
      const width = properties.width * ratio; const height = properties.height * ratio;
      doc.addImage(clinic.logo, properties.fileType, MARGIN, 5, width, height);
      textX = MARGIN + width + 4;
    } catch { textX = MARGIN; }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(clinic.name, textX, 10, { maxWidth: 105 });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(title, textX, 16, { maxWidth: 110 });
  if (subtitle) doc.text(subtitle, textX, 21, { maxWidth: 110 });
  doc.text(new Date().toLocaleString('pt-BR'), PAGE_W - MARGIN, 16, { align: 'right' });
}

function footer(doc: jsPDF) {
  const clinic = clinicIdentity();
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(215, 232, 230);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${clinic.name} - Documento confidencial`, MARGIN, PAGE_H - 8);
    doc.text(`Pagina ${page} de ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }
}

function createDoc(title: string, subtitle?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  documentHeaders.set(doc, { title, subtitle });
  header(doc, title, subtitle);
  return doc;
}

function safe(value: unknown) {
  return String(value ?? '-');
}

function table(doc: jsPDF, options: { startY?: number; head: string[][]; body: unknown[][]; columnStyles?: Record<number, any> }) {
  autoTable(doc, {
    startY: options.startY ?? 34,
    head: options.head,
    body: options.body.map(row => row.map(safe)),
    theme: 'grid',
    margin: { top: 30, right: MARGIN, bottom: 20, left: MARGIN },
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.4,
      overflow: 'linebreak',
      valign: 'middle',
      lineColor: [215, 232, 230],
      lineWidth: 0.1,
      textColor: TEXT,
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: options.columnStyles,
    didDrawPage: () => {
      const details = documentHeaders.get(doc);
      header(doc, details?.title || 'Relatorio', details?.subtitle);
    },
  });
}

function save(doc: jsPDF, filename: string) {
  footer(doc);
  savePdfDocument(doc, filename);
}

async function deliverPdf(doc: jsPDF, filename: string): Promise<void> {
  footer(doc);
  const blob = doc.output('blob');
  if (!blob || blob.size < 1000) throw new Error('O PDF gerado está vazio ou inválido.');
  const safeFilename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-');
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    notify('PDF gerado e preparado para download.', 'info');
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

export async function exportarReciboPagamentoPDF(dados: {
  id?: string;
  pacienteNome: string;
  plano?: string;
  valor: number;
  formaPagamento: string;
  dataPagamento: string;
  responsavel?: string;
  observacoes?: string;
}): Promise<void> {
  if (!dados.pacienteNome.trim()) throw new Error('O pagamento não possui paciente identificado.');
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) throw new Error('O pagamento não possui um valor válido.');
  if (!dados.dataPagamento || Number.isNaN(new Date(`${dados.dataPagamento}T12:00:00`).getTime())) throw new Error('O pagamento não possui uma data válida.');
  if (!dados.formaPagamento.trim()) throw new Error('O pagamento não possui forma de pagamento.');

  const receiptId = dados.id?.trim() || `REC-${dados.dataPagamento.replace(/\D/g, '')}-${Date.now().toString().slice(-6)}`;
  const language = localStorage.getItem('idioma') === 'en' ? 'en' : localStorage.getItem('idioma') === 'es' ? 'es' : 'pt';
  const labels = {
    pt: { title: 'Recibo Individual', receipt: 'Recibo', field: 'Campo', information: 'Informação', patient: 'Paciente', plan: 'Plano', missing: 'Não informado', amount: 'Valor pago', method: 'Forma de pagamento', date: 'Data do pagamento', responsible: 'Responsável pelo recebimento', identification: 'Identificação do recibo', notes: 'Observações', signature: 'Assinatura do Responsável', subject: 'Pagamento de' },
    en: { title: 'Individual Receipt', receipt: 'Receipt', field: 'Field', information: 'Information', patient: 'Patient', plan: 'Plan', missing: 'Not provided', amount: 'Amount paid', method: 'Payment method', date: 'Payment date', responsible: 'Received by', identification: 'Receipt ID', notes: 'Notes', signature: 'Authorized Signature', subject: 'Payment from' },
    es: { title: 'Recibo Individual', receipt: 'Recibo', field: 'Campo', information: 'Información', patient: 'Paciente', plan: 'Plan', missing: 'No informado', amount: 'Valor pagado', method: 'Forma de pago', date: 'Fecha de pago', responsible: 'Responsable del cobro', identification: 'Identificación del recibo', notes: 'Observaciones', signature: 'Firma del Responsable', subject: 'Pago de' },
  }[language];
  const locale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR';
  const doc = createDoc(labels.title, `${labels.receipt} ${receiptId}`);
  doc.setProperties({ title: `${labels.receipt} ${receiptId}`, subject: `${labels.subject} ${dados.pacienteNome}` });
  table(doc, {
    head: [[labels.field, labels.information]],
    body: [
      [labels.patient, dados.pacienteNome],
      [labels.plan, dados.plano || labels.missing],
      [labels.amount, `R$ ${dados.valor.toLocaleString(locale, { minimumFractionDigits: 2 })}`],
      [labels.method, dados.formaPagamento],
      [labels.date, new Date(`${dados.dataPagamento}T12:00:00`).toLocaleDateString(locale)],
      [labels.responsible, dados.responsavel || 'Sistema'],
      [labels.identification, receiptId],
      ...(dados.observacoes?.trim() ? [[labels.notes, dados.observacoes.trim()]] : []),
    ],
    columnStyles: { 0: { fontStyle: 'bold' } },
  });
  const y = Math.min(235, ((doc as any).lastAutoTable?.finalY ?? 110) + 35);
  doc.line(55, y, 155, y);
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(labels.signature, 105, y + 7, { align: 'center' });
  await deliverPdf(doc, `recibo-${dados.pacienteNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}-${dados.dataPagamento}.pdf`);
}

export const exportarPacientesPDF = (pacientes: any[]) => {
  if (!pacientes.length) { alert('Nao existem pacientes para gerar o relatorio.'); return; }
  const doc = createDoc('Relatorio de Pacientes', `${pacientes.length} registro(s)`);
  doc.setProperties({ title: 'Relatorio de Pacientes' });
  table(doc, {
    head: [['Nome', 'CPF', 'Email', 'Telefone', 'Plano', 'Status']],
    body: pacientes.map(p => [
      p.nome,
      p.cpf || '-',
      p.email,
      p.telefone || '-',
      p.plano,
      p.status === 'ativo' ? 'Ativo' : 'Indisponivel',
    ]),
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 27 },
      2: { cellWidth: 42 },
      3: { cellWidth: 27 },
      4: { cellWidth: 28 },
      5: { cellWidth: 22 },
    },
  });
  save(doc, `pacientes-${Date.now()}.pdf`);
};

export const exportarRelatorioFinanceiroPDF = (dados: {
  mes: string;
  receitas: number;
  despesas: number;
  lucro: number;
  transacoes: any[];
}) => {
  const doc = createDoc(`Relatorio Financeiro - ${dados.mes}`);
  doc.setProperties({ title: `Relatorio Financeiro - ${dados.mes}` });

  autoTable(doc, {
    startY: 34,
    body: [
      ['Receitas', `R$ ${dados.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Despesas', `R$ ${dados.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Lucro liquido', `R$ ${dados.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ],
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48 }, 1: { halign: 'right' } },
  });

  table(doc, {
    startY: ((doc as any).lastAutoTable?.finalY ?? 58) + 8,
    head: [['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor']],
    body: dados.transacoes.map(t => [
      t.data ? formatCalendarDate(t.data) : '-',
      t.descricao,
      t.categoria,
      t.tipo === 'receita' ? 'Receita' : 'Despesa',
      `R$ ${Number(t.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    ]),
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 62 },
      2: { cellWidth: 36 },
      3: { cellWidth: 24 },
      4: { cellWidth: 30, halign: 'right' },
    },
  });

  save(doc, `relatorio-financeiro-${dados.mes}-${Date.now()}.pdf`);
};

export const exportarDeclaracaoPresencaPDF = (dados: {
  nomeAluno: string;
  cpf?: string;
  periodo: string;
  aulasRealizadas: number;
  totalAulas: number;
}) => {
  const doc = createDoc('Declaracao de Frequencia');
  doc.setProperties({ title: 'Declaracao de Frequencia' });
  const frequencia = dados.totalAulas ? ((dados.aulasRealizadas / dados.totalAulas) * 100).toFixed(1) : '0.0';
  const texto = `Declaramos para os devidos fins que ${dados.nomeAluno}${dados.cpf ? `, CPF ${dados.cpf},` : ''} esta regularmente matriculado(a). No periodo de ${dados.periodo}, realizou ${dados.aulasRealizadas} aulas de um total de ${dados.totalAulas}, representando frequencia de ${frequencia}%.`;
  const linhas = doc.splitTextToSize(texto, PAGE_W - MARGIN * 2);
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  doc.text(linhas, MARGIN, 45);
  const y = Math.min(210, 55 + linhas.length * 6);
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, MARGIN, y);
  doc.line(55, y + 38, 155, y + 38);
  doc.setFontSize(10);
  doc.text('Assinatura do Responsavel', 105, y + 45, { align: 'center' });
  save(doc, `declaracao-presenca-${dados.nomeAluno.replace(/\s/g, '-')}-${Date.now()}.pdf`);
};

export const exportarProfessoresPDF = (professores: any[]) => {
  if (!professores.length) { alert('Nao existem profissionais para gerar o relatorio.'); return; }
  const doc = createDoc('Relatorio de Fisioterapeutas', `${professores.length} registro(s)`);
  doc.setProperties({ title: 'Relatorio de Fisioterapeutas' });
  table(doc, {
    head: [['Nome', 'Email', 'Telefone', 'CREF', 'Modalidades', 'Status']],
    body: professores.map(p => [
      p.nome,
      p.email,
      p.telefone,
      p.cref,
      Array.isArray(p.modalidades) ? p.modalidades.join(', ') : '-',
      p.status === 'ativo' ? 'Ativo' : p.status === 'ferias' ? 'Ferias' : 'Inativo',
    ]),
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 44 },
      2: { cellWidth: 27 },
      3: { cellWidth: 24 },
      4: { cellWidth: 34 },
      5: { cellWidth: 18 },
    },
  });
  save(doc, `fisioterapeutas-${Date.now()}.pdf`);
};

export const exportarAgendamentosPDF = (agendamentos: any[], periodo: string) => {
  if (!agendamentos.length) { alert('Nao existem agendamentos no periodo selecionado.'); return; }
  const doc = createDoc(`Agenda - ${periodo}`, `${agendamentos.length} agendamento(s)`);
  doc.setProperties({ title: `Agenda - ${periodo}` });
  table(doc, {
    head: [['Dia', 'Horario', 'Paciente', 'Professor', 'Sala', 'Tipo', 'Status']],
    body: agendamentos.map(a => [
      ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'][a.day] ?? '-',
      `${a.startTime} - ${a.endTime}`,
      a.studentName,
      a.professor,
      a.room,
      a.tipoAula === 'experimental' ? 'Experimental' : 'Regular',
      a.status === 'confirmado' ? 'Confirmado' : a.status === 'pendente' ? 'Pendente' : 'Cancelado',
    ]),
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 38 },
      3: { cellWidth: 34 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
    },
  });
  save(doc, `agendamentos-${periodo.replace(/\s/g, '-')}-${Date.now()}.pdf`);
};

export const exportarReciboFisioterapeutaPDF = (dados: {
  nomeFisioterapeuta: string;
  cref: string;
  periodo: string;
  atendimentos: number;
  valorPorAtendimento: number;
  valorTotal: number;
  dataEmissao: string;
}) => {
  const doc = createDoc('Recibo de Pagamento');
  doc.setProperties({ title: 'Recibo de Pagamento' });
  table(doc, {
    head: [['Campo', 'Informacao']],
    body: [
      ['Profissional', dados.nomeFisioterapeuta],
      ['CREF', dados.cref],
      ['Periodo', dados.periodo],
      ['Atendimentos', dados.atendimentos],
      ['Valor por atendimento', `R$ ${dados.valorPorAtendimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Valor total', `R$ ${dados.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Data de emissao', dados.dataEmissao],
    ],
    columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' }, 1: { cellWidth: 124 } },
  });
  const y = Math.min(235, ((doc as any).lastAutoTable?.finalY ?? 90) + 35);
  doc.line(55, y, 155, y);
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text('Assinatura do Responsavel', 105, y + 7, { align: 'center' });
  save(doc, `recibo-${dados.nomeFisioterapeuta.replace(/\s/g, '-')}-${dados.periodo.replace(/\s/g, '-')}.pdf`);
};
