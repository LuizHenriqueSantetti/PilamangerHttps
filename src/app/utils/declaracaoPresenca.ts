import { savePdfDocument } from './pdfDelivery';
import { jsPDF } from 'jspdf';

export interface DeclaracaoPresencaData {
  pacienteNome: string;
  pacienteCPF?: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  profissionalNome: string;
  profissionalRegistro?: string;
  observacoes?: string;
}

export const gerarDeclaracaoPresenca = (data: DeclaracaoPresencaData) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 20;
  let y = 20;

  const azul: [number, number, number] = [91, 141, 239];
  const cinza: [number, number, number] = [107, 114, 128];
  const preto: [number, number, number] = [31, 41, 55];

  // Cabeçalho
  doc.setFillColor(...azul);
  doc.rect(0, 0, W, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('DECLARAÇÃO DE PRESENÇA', W / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PilaManager Studio', W / 2, 25, { align: 'center' });

  y = 50;

  // Corpo da declaração
  doc.setTextColor(...preto);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  const textoDeclaracao = `Declaramos para os devidos fins que ${data.pacienteNome}${data.pacienteCPF ? `, CPF ${data.pacienteCPF},` : ''} compareceu à sessão de Pilates Clínico no dia ${new Date(data.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}, no horário das ${data.horaInicio} às ${data.horaFim}.`;

  const linhas = doc.splitTextToSize(textoDeclaracao, W - margin * 2);
  linhas.forEach((linha: string) => {
    doc.text(linha, margin, y);
    y += 7;
  });

  y += 10;

  // Informações adicionais
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Profissional Responsável:', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 7;
  doc.text(data.profissionalNome, margin, y);
  if (data.profissionalRegistro) {
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(...cinza);
    doc.text(`Registro: ${data.profissionalRegistro}`, margin, y);
    doc.setTextColor(...preto);
    doc.setFontSize(11);
  }

  y += 15;

  if (data.observacoes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const obsLinhas = doc.splitTextToSize(data.observacoes, W - margin * 2);
    obsLinhas.forEach((linha: string) => {
      doc.text(linha, margin, y);
      y += 6;
    });
    y += 10;
  }

  y += 20;

  // Data de emissão
  doc.setFontSize(10);
  doc.setTextColor(...cinza);
  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`${dataEmissao}`, W / 2, y, { align: 'center' });
  y += 15;

  // Linha de assinatura
  doc.setDrawColor(...cinza);
  doc.line(margin + 30, y, W - margin - 30, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...preto);
  doc.text('PilaManager Studio', W / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...cinza);
  doc.text('Assinatura e Carimbo', W / 2, y, { align: 'center' });

  // Rodapé
  y = 280;
  doc.setFontSize(8);
  doc.text('Este documento foi gerado eletronicamente e é válido sem assinatura digital.', W / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Código de verificação: ${Date.now().toString(36).toUpperCase()}`, W / 2, y, { align: 'center' });

  // Salvar PDF
  const nomeArquivo = `declaracao-presenca-${data.pacienteNome.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
  savePdfDocument(doc, nomeArquivo);
};
