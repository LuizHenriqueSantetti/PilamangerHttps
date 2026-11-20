import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => ({ pending: false, flush: vi.fn() }));
vi.mock('../src/app/services/remoteStorageSync', () => ({
  hasPendingRemoteChanges: () => remote.pending,
  flushRemoteStorage: remote.flush,
}));

beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); remote.pending = false;
  remote.flush.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('notificações globais', () => {
  it('deduplica, limita a pilha a três e remove após quatro segundos mais saída', async () => {
    const n = await import('../src/app/utils/notifications');
    n.notify('Um', 'success'); n.notify('Um', 'success');
    expect(n.getNotifications()).toHaveLength(1);
    n.notify('Dois'); n.notify('Três', 'warning'); n.notify('Quatro', 'error');
    expect(n.getNotifications().map(item => item.message)).toEqual(['Dois', 'Três', 'Quatro']);
    await vi.advanceTimersByTimeAsync(4000);
    expect(n.getNotifications().every(item => item.leaving)).toBe(true);
    await vi.advanceTimersByTimeAsync(180); expect(n.getNotifications()).toEqual([]);
  });
  it('permite dispensar manualmente sem aguardar o prazo', async () => {
    const n = await import('../src/app/utils/notifications');
    n.notify('Aviso'); n.dismissNotification(n.getNotifications()[0].id);
    await vi.advanceTimersByTimeAsync(180); expect(n.getNotifications()).toEqual([]);
  });
  it('aguarda confirmação remota antes de notificar sucesso', async () => {
    const n = await import('../src/app/utils/notifications');
    let release!: () => void;
    remote.pending = true; remote.flush.mockReturnValue(new Promise<void>(resolve => { release = resolve; }));
    n.notify('Salvo.', 'success'); expect(n.getNotifications()).toEqual([]);
    release(); await Promise.resolve(); expect(n.getNotifications()[0].type).toBe('success');
  });
  it('não apresenta sucesso se a gravação falhar', async () => {
    const n = await import('../src/app/utils/notifications');
    remote.pending = true; remote.flush.mockRejectedValue(new TypeError('Failed to fetch'));
    n.notify('Salvo.', 'success'); await Promise.resolve(); await Promise.resolve();
    expect(n.getNotifications().some(item => item.type === 'success')).toBe(false);
    expect(n.getNotifications()[0].message).toContain('conexão');
  });
  it('bloqueia cliques repetidos na mesma operação enquanto aguarda servidor', async () => {
    const n = await import('../src/app/utils/notifications');
    let release!: () => void;
    remote.flush.mockReturnValue(new Promise<void>(resolve => { release = resolve; }));
    const operation = vi.fn();
    const first = n.performAction('patient', operation, 'Paciente cadastrado.');
    expect(await n.performAction('patient', operation, 'Paciente cadastrado.')).toBe(false);
    await Promise.resolve(); expect(operation).toHaveBeenCalledOnce();
    expect(n.getNotifications()).toEqual([]);
    release(); expect(await first).toBe(true);
    expect(n.getNotifications().filter(item => item.type === 'success')).toHaveLength(1);
  });
  it('retorna false no erro para manter o formulário e aceita nova tentativa', async () => {
    const n = await import('../src/app/utils/notifications');
    remote.flush.mockRejectedValueOnce(new Error('Não foi possível salvar.'));
    expect(await n.performAction('plans', () => {}, 'Plano cadastrado.')).toBe(false);
    expect(n.getNotifications().some(item => item.type === 'success')).toBe(false);
    expect(await n.performAction('plans', () => {}, 'Plano cadastrado.')).toBe(true);
  });
  it('confirma a escrita pendente sem executar novamente o cadastro', async () => {
    const n = await import('../src/app/utils/notifications');
    const record = { id: 'stable-id' };
    const create = vi.fn(() => { remote.pending = true; return record; });
    remote.flush.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await n.performActionWithResult('create', create, 'Cadastro realizado.')).toEqual({ ok: false });
    remote.flush.mockImplementation(async () => { remote.pending = false; });
    expect(await n.performActionWithResult('create', create, 'Cadastro realizado.')).toEqual({ ok: true, value: record });
    expect(create).toHaveBeenCalledOnce();
  });
  it('só exibe processamento em operações demoradas e encerra o aviso', async () => {
    const n = await import('../src/app/utils/notifications');
    let release!: () => void;
    const work = n.performAction('slow', () => new Promise<void>(resolve => { release = resolve; }), 'Concluído.');
    await vi.advanceTimersByTimeAsync(450);
    expect(n.getNotifications()[0].persistent).toBe(true);
    release(); await work; await vi.advanceTimersByTimeAsync(180);
    expect(n.getNotifications().map(item => item.message)).toEqual(['Concluído.']);
  });
  it('remove detalhes técnicos, e-mail e CPF das mensagens', async () => {
    const n = await import('../src/app/utils/notifications');
    expect(n.publicMessage('D1_ERROR: constraint failed password_hash')).not.toContain('D1');
    expect(n.publicMessage('Contato nome@example.test CPF 123.456.789-00')).toBe('Contato [e-mail] CPF [documento]');
    expect(n.publicMessage('Bearer SECRET')).not.toContain('SECRET');
  });
  it('classifica expiração e conflitos como aviso e permissão como erro', async () => {
    const n = await import('../src/app/utils/notifications');
    n.notifyError(new Error('Sessão expirada.')); n.notifyError(new Error('Horário ocupado.'));
    n.notifyError(new Error('Sem permissão.'));
    expect(n.getNotifications().map(item => item.type)).toEqual(['warning', 'warning', 'error']);
  });
  it('aguarda confirmação explícita e rejeita uma segunda janela simultânea', async () => {
    const n = await import('../src/app/utils/notifications');
    let request!: import('../src/app/utils/notifications').ConfirmationRequest;
    const listener = (event: Event) => { request = (event as CustomEvent).detail; };
    window.addEventListener(n.CONFIRMATION_EVENT, listener);
    try {
      const choice = n.confirmAction('Excluir?');
      expect(await n.confirmAction('Outro?')).toBe(false);
      request.resolve(false); expect(await choice).toBe(false);
      const confirmed = n.confirmAction('Excluir?'); request.resolve(true); expect(await confirmed).toBe(true);
    } finally { window.removeEventListener(n.CONFIRMATION_EVENT, listener); }
  });
  it('converte alertas antigos em aviso sem popup nativo', async () => {
    const n = await import('../src/app/utils/notifications');
    n.installAlertBridge(); window.alert('Preencha os campos obrigatórios.');
    expect(n.getNotifications()[0].type).toBe('warning');
  });
});
