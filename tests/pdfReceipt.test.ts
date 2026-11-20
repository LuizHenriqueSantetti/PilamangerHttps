import { describe, expect, it, vi } from 'vitest';
import { exportarReciboPagamentoPDF, exportarRelatorioFinanceiroPDF } from '../src/app/utils/pdfExport';
import { savePdfDocument } from '../src/app/utils/pdfDelivery';
vi.mock('../src/app/utils/pdfDelivery', () => ({ savePdfDocument: vi.fn(() => true) }));

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

  it('mantém o dia civil das transações no PDF em fuso brasileiro', async () => {
    vi.stubEnv('TZ', 'America/Sao_Paulo');
    try {
      exportarRelatorioFinanceiroPDF({ mes: 'Homologação', receitas: 320, despesas: 0, lucro: 320,
        transacoes: [{ data: '2026-11-20', descricao: 'Pagamento fictício', categoria: 'Planos', tipo: 'receita', valor: 320 }] });
      const doc = vi.mocked(savePdfDocument).mock.calls.at(-1)![0];
      const blob = doc.output('blob');
      expect(blob.type).toBe('application/pdf');
      const pdf = new TextDecoder('latin1').decode(await blob.arrayBuffer());
      expect(pdf).toContain('(20/11/2026) Tj');
      expect(pdf).not.toContain('(19/11/2026) Tj');
    } finally { vi.unstubAllEnvs(); }
  });
});
