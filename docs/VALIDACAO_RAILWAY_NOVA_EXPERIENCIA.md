# Validação da Nova Experiência no Railway — 20/11/2026

## Fonte e escopo

Fonte: Site exato indicado pelo usuário, versão 13, commit
`184b6ea9e5aa24f18ec55cbecb1c35c5f59ea5cb`.
Não é a aplicação anterior do ZIP. Os resultados anteriores desse ZIP não
constituem validação desta fonte. O Site original permaneceu intacto.
Nenhum paciente, usuário ou dado clínico do Site foi importado.

A cópia foi adaptada de Workers/D1 para Next.js/Node/PostgreSQL no Railway.
Foram preservados os arquivos de interface e estilos, sem redesenho.
Contas, pacientes, profissionais, plano, agenda e valores desta implantação
são fixtures fictícias de homologação.

## Verificado de verdade

- Dependências instaladas; TypeScript, build e 105 testes existentes executados.
  A suíte unitária contém mocks: não deve ser confundida com integração real.
- PostgreSQL local iniciado; migration e seed fictício executados.
- 62 verificações HTTP locais aprovadas, incluindo persistência de coleções,
  sessão, logout, rejeição de origem, permissões, inativação e bloqueio de login.
- 17 verificações financeiras locais aprovadas: recebimento, comissão calculada
  no servidor, pagamento e rejeição de duplicidades e alterações indevidas.
- 6 verificações adicionais do adaptador PostgreSQL aprovadas: parâmetros SQL,
  rollback de lote, persistência de bytes e leitura por nova conexão.
- Cadastro de paciente feito pela interface local, sem alteração de design.
- 47 verificações HTTPS aprovadas na fonte correta, com duas contas fictícias:
  gestão e recepção; sessão independente, senha temporária, cookies Secure,
  HttpOnly e SameSite=Lax, HSTS, leitura compartilhada e bloqueio de privilégios.
- Login das duas contas conferido no navegador. Módulos Pacientes, Equipe,
  Planos, Agendamento, Cobranças, Comissionamento, Financeiro e Relatórios
  carregaram para gestão. Recepção não apresenta os menus financeiros restritos.
- Tela móvel emulada em 390x844; lista de paciente aparece em cartões.
- PostgreSQL online consultado diretamente por SSH: versão 18.6, schema isolado,
  migration registrada, duas contas e nove coleções na ocasião da inspeção.
- Dump manual gerado no PostgreSQL online e baixado. Restaurado de verdade em
  PostgreSQL 17 local, banco temporário, com duas contas e paciente fictício
  conferidos; o banco temporário foi removido após a verificação.

As evidências detalhadas estão em `test-results/` local, ignorado pelo Git.
Credenciais e dump estão em arquivos privados locais, nunca neste relatório.

## Limites e pendências

- Dispositivos físicos distintos não estavam disponíveis; a verificação móvel
  foi emulação. Duas sessões HTTP e duas contas foram usadas, sem afirmar teste
  físico em dois computadores/celulares.
- A navegação não equivale a testar todos os formulários, relatórios PDF,
  idiomas, acessibilidade, integrações externas e cenários concorrentes.
- Coleções operacionais continuam no formato JSON original em `app_storage`.
  Não foi implantada normalização relacional completa de pacientes e agenda.
- Não foram realizados pentest, teste de carga ou certificação de segurança,
  LGPD ou aptidão para uso clínico com dados reais.
- Backup automático, agendamento e recuperação pontual do Railway exigiram
  Pro na interface desta conta. Nenhum plano pago foi ativado. O dump manual
  testado é uma cópia pontual, não uma rotina automática.
- Domínio próprio não foi fornecido e nenhum foi comprado. Foi usado o
  endereço gratuito do Railway com HTTPS.
- Repositório privado criado; implantação por CLI. Autodeploy GitHub depende
  de autorização adicional do GitHub App e permanece pendente.
- O período de teste e seus créditos são finitos; não se promete 30 dias
  integrais de funcionamento independentemente do consumo. Não houve upgrade.

Esta é uma demonstração funcional validada nos cenários descritos, sem
aprovação irrestrita para dados reais.

## Dependências e preservação visual

A auditoria inicial detectou alertas em dependências antigas. Foram atualizados
Next.js para 16.4.5, React/ReactDOM para 19.2.9 e dependências transitivas corrigidas.
Vinext foi movido para ferramentas de desenvolvimento, pois o runtime publicado
é Next.js. `pnpm audit --prod` após a atualização retornou zero alertas em todas
as severidades no momento da consulta. Isso não equivale a ausência de toda
vulnerabilidade possível. Os 105 testes passaram novamente após a atualização.
Foram comparados os 120 arquivos de `src/app` e `src/styles` com a fonte
original: nenhuma diferença de conteúdo.

## Confirmação após a publicação final

- Repositório privado verificado:
  https://github.com/LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres
- Código publicado: commit `c7d3622`.
- Implantação final Railway: `b8e1706b-be19-4ff0-80f0-0e6950450c85`, estado SUCCESS.
- Logs do servidor confirmaram Next.js 16.4.5 na porta 8080 e healthcheck aprovado.
- Após essa troca de implantação, mais 20 verificações HTTP passaram. As duas
  contas continuaram funcionando, o paciente, o recebimento e a comissão paga
  sobreviveram; as restrições de recepção e a revogação de sessão foram repetidas.
- O painel HTTPS foi recarregado no navegador após a troca de servidor e manteve
  sessão, paciente e valores fictícios. Captura: `test-results/nova-experiencia-https.jpg`.
- O servidor local também foi reiniciado com as dependências atualizadas:
  17 verificações financeiras e seis do adaptador PostgreSQL passaram novamente.
  O paciente cadastrado pela interface permaneceu visível após reinício e reload.
- Build e TypeScript finais aprovados. Auditoria de produção: zero alertas
  conhecidos no momento da consulta, sem afirmação de certificação de segurança.
- Dump manual testado: 18.403 bytes; SHA-256
  `6083DFDD5A4241FFF89826AA739ECC15980718EA9A60086FDE41E15FE9715B0B`.
- Acesso das duas contas foi guardado em `.private/ACESSO_DEMONSTRACAO.txt`,
  ignorado pelo Git. Não reutilizar essas contas de homologação com dados reais.

Avisos de peer dependencies e componentes legados (por exemplo Recharts 2)
continuam presentes. A atualização de bibliotecas visuais para novas versões
principais não fez parte deste trabalho, para preservar o comportamento visual.
