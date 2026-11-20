import type { jsPDF } from 'jspdf';
import { notify, notifyError } from './notifications';

// Preparing a file is observable; completion of the browser download is not.
export function savePdfDocument(doc: jsPDF, filename: string): boolean {
  try {
    const blob = doc.output('blob');
    if (!blob || blob.size < 1000) throw new Error('Não foi possível gerar um PDF válido.');
    doc.save(filename);
    notify('PDF gerado e preparado para download.', 'info');
    return true;
  } catch (error) {
    notifyError(error, 'Não foi possível gerar o PDF. Tente novamente.');
    return false;
  }
}
