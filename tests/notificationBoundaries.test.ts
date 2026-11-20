import { afterEach, describe, expect, it, vi } from 'vitest';
import type { jsPDF } from 'jspdf';
import { savePdfDocument } from '../src/app/utils/pdfDelivery';
import { authService } from '../src/app/services/authService';
import { storageService } from '../src/app/services/storageService';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('limites reais de confirmação', () => {
  it('não trata falha de rede como senha atual incorreta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(authService.updatePassword('qa@example.test', 'synthetic-current', 'synthetic-new')).rejects.toThrow('conexão');
  });
  it('preserva a mensagem validada de senha incorreta enviada pelo servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Senha atual incorreta.' }, { status: 400 })));
    await expect(authService.updatePassword('qa@example.test', 'synthetic-current', 'synthetic-new')).rejects.toThrow('Senha atual incorreta');
  });
  it('não confirma salvamento quando o navegador impede a escrita', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(storageService.set('profissionais', []).ok).toBe(false);
  });
  it('recusa PDF vazio sem acionar o download', () => {
    const save = vi.fn();
    const doc = { output: () => new Blob([]), save } as unknown as jsPDF;
    expect(savePdfDocument(doc, 'qa.pdf')).toBe(false); expect(save).not.toHaveBeenCalled();
  });
  it('prepara PDF válido antes de informar a geração', () => {
    const save = vi.fn();
    const doc = { output: () => new Blob(['x'.repeat(1500)]), save } as unknown as jsPDF;
    expect(savePdfDocument(doc, 'qa.pdf')).toBe(true); expect(save).toHaveBeenCalledWith('qa.pdf');
  });
});
