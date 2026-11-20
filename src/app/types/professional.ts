export type ProfessionalType = 'professor' | 'fisioterapeuta';
export type ProfessionalStatus = 'ativo' | 'inativo';
export type CommissionType = 'percentual' | 'fixa' | 'hibrida';

export interface ProfessionalAddress {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface ProfessionalBankDetails {
  banco: string;
  codigoBanco: string;
  agencia: string;
  conta: string;
  digitoConta: string;
  tipoConta: 'corrente' | 'poupanca' | '';
  chavePix: string;
  tipoChavePix: 'cpf' | 'email' | 'telefone' | 'aleatoria' | '';
  nomeTitular: string;
  cpfTitular: string;
}

export interface Professional {
  id: string;
  foto: string;
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  endereco: ProfessionalAddress;
  observacoes: string;
  tipo: ProfessionalType;
  registroProfissional: string;
  especialidade: string;
  modalidades: string[];
  dataAdmissao: string;
  status: ProfessionalStatus;
  horarios: { dia: string; inicio: string; fim: string }[];
  duracaoAula: number;
  intervalos: { dia: string; inicio: string; fim: string }[];
  bloqueios: { data: string; inicio: string; fim: string; motivo?: string }[];
  indisponibilidades: { inicio: string; fim: string; motivo?: string }[];
  alunosAtivos: number;
  avaliacao: number;
  tipoContrato: 'CLT' | 'PJ' | 'Horista';
  metodoPagamento: 'pix' | 'ted' | 'dinheiro' | 'outro';
  tipoComissao: CommissionType;
  comissaoPercentual: number;
  valorFixoAula: number;
  regrasPagamento: string;
  dadosBancarios: ProfessionalBankDetails;
  privacyConsent?: {
    accepted: boolean;
    acceptedAt: string;
    version: string;
    scope: 'profissional';
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type ProfessionalInput = Omit<Professional, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'avaliacao' | 'alunosAtivos'> & {
  avaliacao?: number;
  alunosAtivos?: number;
};
