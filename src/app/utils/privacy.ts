export const PRIVACY_POLICY_VERSION = '2.0';

export const PRIVACY_POLICY_TITLE = 'Política de Privacidade e Uso de Dados';

export const PRIVACY_CONSENT_TEXT = 'Li e aceito a Política de Privacidade e autorizo o tratamento dos meus dados.';

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: 'Finalidade',
    text: 'O PilaManager utiliza dados pessoais para permitir login, cadastro de usuários, controle de pacientes, agendamentos, planos, cobranças, relatórios e comunicação operacional da clínica.',
  },
  {
    title: 'Dados Tratados',
    text: 'Podem ser tratados dados de identificação, contato, documentos, informações profissionais, dados bancários de profissionais e informações de saúde fornecidas no cadastro de pacientes.',
  },
  {
    title: 'Base Legal e Consentimento',
    text: 'O tratamento de dados sensíveis depende de autorização do titular ou de seu responsável, quando aplicável. O sistema registra a data e hora do aceite para fins de controle interno.',
  },
  {
    title: 'Acesso, Correção e Exclusão',
    text: 'O titular pode solicitar consulta, correção, atualização ou exclusão de seus dados, respeitadas obrigações legais, administrativas e registros necessários para a operação da clínica.',
  },
  {
    title: 'Segurança',
    text: 'O sistema aplica autenticação no servidor, controle de acesso por perfil e restrição de informações conforme a necessidade de cada função. Os dados operacionais são enviados por conexão HTTPS e persistidos no banco gerenciado da aplicação; o navegador mantém apenas preferências e cache temporário.',
  },
];

export function createPrivacyAcceptance<TScope extends 'usuario' | 'paciente' | 'profissional'>(scope: TScope) {
  return {
    accepted: true,
    acceptedAt: new Date().toISOString(),
    version: PRIVACY_POLICY_VERSION,
    scope,
  };
}
