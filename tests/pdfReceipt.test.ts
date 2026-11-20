import { describe, expect, it, vi } from 'vitest';
import { exportarReciboPagamentoPDF } from '../src/app/utils/pdfExport';

describe('recibo individual em PDF', () => {
  it('gera blob PDF válido com nome estável e dados completos', async () => {
    let generatedBlob: Blob | null = null;
    let downloadedName = '';
    const link = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() };
    Object.assign(globalThis, {
      document: { createElement: () => link, body: { appendChild: () => { downloadedName = link.download; } } },
    });
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { generatedBlob = blob; return 'blob:receipt'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await exportarReciboPagamentoPDF({
      id: 'PG-123', pacienteNome: 'José Ávila', plano: 'Pilates Essencial', valor: 350,
      formaPagamento: 'Pix', dataPagamento: '2026-06-27', responsavel: 'Maria', observacoes: 'Referente ao mês de junho.',
    });

    expect(generatedBlob).not.toBeNull();
    expect(generatedBlob!.type).toBe('application/pdf');
    expect(generatedBlob!.size).toBeGreaterThan(1000);
    expect(downloadedName).toBe('recibo-jose-avila-2026-06-27.pdf');
    expect(link.click).toHaveBeenCalledOnce();
  });

  it('não gera recibo vazio ou com dados obrigatórios incompletos', async () => {
    await expect(exportarReciboPagamentoPDF({ pacienteNome: '', valor: 0, formaPagamento: '', dataPagamento: '', responsavel: '' })).rejects.toThrow();
  });
});
