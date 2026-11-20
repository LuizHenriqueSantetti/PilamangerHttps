import { onlyDigits } from '../utils/masks';
import { Professional, ProfessionalBankDetails, ProfessionalInput } from '../types/professional';
import { auditService } from './auditService';
import { storageService } from './storageService';

const STORAGE_KEY = 'profissionais';
const MIGRATION_KEY = 'profissionaisMigrationV2';

export const emptyBankDetails = (): ProfessionalBankDetails => ({
  banco: '', codigoBanco: '', agencia: '', conta: '', digitoConta: '', tipoConta: '',
  chavePix: '', tipoChavePix: '', nomeTitular: '', cpfTitular: '',
});

function normalize(raw: any): Professional {
  const now = new Date().toISOString();
  const bank = raw.dadosBancarios || raw.bankDetails || {};
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    foto: String(raw.foto ?? raw.avatar ?? ''),
    nome: String(raw.nome ?? raw.name ?? '').trim(),
    cpf: String(raw.cpf ?? ''),
    rg: String(raw.rg ?? ''),
    dataNascimento: String(raw.dataNascimento ?? ''),
    telefone: String(raw.telefone ?? raw.phone ?? ''),
    email: String(raw.email ?? '').trim().toLowerCase(),
    endereco: {
      cep: String(raw.endereco?.cep ?? raw.cep ?? ''),
      logradouro: String(raw.endereco?.logradouro ?? raw.enderecoTexto ?? ''),
      numero: String(raw.endereco?.numero ?? ''), complemento: String(raw.endereco?.complemento ?? ''),
      bairro: String(raw.endereco?.bairro ?? ''), cidade: String(raw.endereco?.cidade ?? ''), uf: String(raw.endereco?.uf ?? ''),
    },
    observacoes: String(raw.observacoes ?? raw.bio ?? ''),
    tipo: raw.tipo === 'professor' ? 'professor' : 'fisioterapeuta',
    registroProfissional: String(raw.registroProfissional ?? raw.cref ?? ''),
    especialidade: String(raw.especialidade ?? (Array.isArray(raw.especialidades) ? raw.especialidades.join(', ') : '')),
    modalidades: Array.isArray(raw.modalidades) ? raw.modalidades.map(String) : [],
    dataAdmissao: String(raw.dataAdmissao ?? ''),
    status: raw.status === 'inativo' || raw.deletedAt ? 'inativo' : 'ativo',
    horarios: Array.isArray(raw.horarios) ? raw.horarios : [],
    duracaoAula: Math.max(15, Number(raw.duracaoAula || 60)),
    intervalos: Array.isArray(raw.intervalos) ? raw.intervalos : [],
    bloqueios: Array.isArray(raw.bloqueios) ? raw.bloqueios : [],
    indisponibilidades: Array.isArray(raw.indisponibilidades) ? raw.indisponibilidades : [],
    alunosAtivos: Number(raw.alunosAtivos ?? raw.alunos ?? 0),
    avaliacao: Number(raw.avaliacao ?? 0),
    tipoContrato: ['CLT', 'PJ', 'Horista'].includes(raw.tipoContrato) ? raw.tipoContrato : 'PJ',
    metodoPagamento: ['pix', 'ted', 'dinheiro', 'outro'].includes(raw.metodoPagamento) ? raw.metodoPagamento : 'pix',
    tipoComissao: ['percentual', 'fixa', 'hibrida'].includes(raw.tipoComissao) ? raw.tipoComissao : 'percentual',
    comissaoPercentual: Number(raw.comissaoPercentual ?? raw.percentual ?? raw.percentualH ?? 0),
    valorFixoAula: Number(raw.valorFixoAula ?? raw.valorFixo ?? raw.valorMinimo ?? 0),
    regrasPagamento: String(raw.regrasPagamento ?? ''),
    dadosBancarios: { ...emptyBankDetails(), ...bank },
    privacyConsent: raw.privacyConsent,
    createdAt: String(raw.createdAt ?? now), updatedAt: String(raw.updatedAt ?? now),
    deletedAt: raw.deletedAt ? String(raw.deletedAt) : undefined,
  };
}

function migrate(): Professional[] {
  const existing = storageService.get<any[]>(STORAGE_KEY, []);
  if (storageService.get(MIGRATION_KEY, false)) return existing.map(normalize);
  const legacy = [
    ...storageService.get<any[]>('fisioterapeutas', []),
    ...storageService.get<any[]>('professores', []),
  ];
  const source = existing.length ? existing : legacy;
  const unique = new Map<string, Professional>();
  source.map(normalize).forEach(item => {
    const key = onlyDigits(item.cpf) || item.email || item.id;
    if (!unique.has(key)) unique.set(key, item);
  });
  const migrated = [...unique.values()];
  storageService.set(STORAGE_KEY, migrated);
  storageService.set(MIGRATION_KEY, true);
  return migrated;
}

function persist(items: Professional[]) {
  const result = storageService.set(STORAGE_KEY, items);
  if (!result.ok) throw result.error || new Error('Não foi possível salvar o profissional.');
  window.dispatchEvent(new CustomEvent('pilamanager:professionals-updated'));
  window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
}

export const professionalService = {
  list(options: { includeInactive?: boolean; includeDeleted?: boolean } = {}): Professional[] {
    return migrate().filter(item => (options.includeDeleted || !item.deletedAt) && (options.includeInactive || item.status === 'ativo'));
  },

  get(id: string): Professional | null {
    return migrate().find(item => item.id === id) ?? null;
  },

  findDuplicate(cpf: string, email: string, ignoreId?: string): 'cpf' | 'email' | null {
    const cpfDigits = onlyDigits(cpf);
    const normalizedEmail = email.trim().toLowerCase();
    for (const item of migrate()) {
      if (item.id === ignoreId || item.deletedAt) continue;
      if (cpfDigits && onlyDigits(item.cpf) === cpfDigits) return 'cpf';
      if (normalizedEmail && item.email === normalizedEmail) return 'email';
    }
    return null;
  },

  save(input: ProfessionalInput, id?: string): Professional {
    const items = migrate();
    const now = new Date().toISOString();
    const index = id ? items.findIndex(item => item.id === id) : -1;
    const before = index >= 0 ? items[index] : undefined;
    const record = normalize({ ...before, ...input, id: id || crypto.randomUUID(), createdAt: before?.createdAt || now, updatedAt: now });
    if (index >= 0) items[index] = record; else items.unshift(record);
    persist(items);
    auditService.record({
      action: index >= 0 ? 'Atualizou profissional' : 'Criou profissional',
      actionType: index >= 0 ? 'update' : 'create', module: 'Profissionais', recordId: record.id,
      before: before ? { nome: before.nome, tipo: before.tipo, status: before.status } : undefined,
      after: { nome: record.nome, tipo: record.tipo, status: record.status },
    });
    return record;
  },

  setStatus(id: string, status: Professional['status']): void {
    const items = migrate();
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return;
    const before = items[index].status;
    items[index] = { ...items[index], status, updatedAt: new Date().toISOString() };
    persist(items);
    auditService.record({ action: status === 'ativo' ? 'Ativou profissional' : 'Inativou profissional', actionType: 'update', module: 'Profissionais', recordId: id, before: { status: before }, after: { status } });
  },

  softDelete(id: string): void {
    const items = migrate();
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return;
    items[index] = { ...items[index], status: 'inativo', deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    persist(items);
    auditService.record({ action: 'Excluiu profissional logicamente', actionType: 'delete', module: 'Profissionais', recordId: id, before: { nome: items[index].nome }, after: { status: 'inativo' } });
  },

  hasBankDetails(item: Professional): boolean {
    const bank = item.dadosBancarios;
    return Boolean(bank.banco || bank.agencia || bank.conta || bank.chavePix || bank.nomeTitular);
  },
};
