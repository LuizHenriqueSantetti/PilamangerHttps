# Contexto técnico do PilaManager 2.1

Última auditoria: 2026-06-29.

## Fonte oficial

- Pasta oficial: `C:\Users\Usuário\Documents\´PilaManager 2.1`.
- O caractere `´` faz parte do nome atual da pasta no disco.
- Não aplicar mudanças nas cópias antigas `Site Pillamanger`, `PilaManager 2.0` ou em artefatos de outras conversas.
- A pasta não possui um repositório Git próprio. O Git encontrado acima dela pertence ao diretório do usuário e não deve ser usado para calcular o diff deste projeto.

## Arquitetura atual

- SPA React 18 e TypeScript, empacotada pelo Vite 6.
- Não utiliza React Router. `App.tsx` controla autenticação e `Dashboard.tsx` controla a navegação interna por estado.
- `src/app/components`: telas, modais e componentes reutilizáveis.
- `src/app/components/ui`: biblioteca de componentes baseada em Radix UI.
- `src/app/services`: serviços de autenticação, armazenamento, agenda, pacientes, profissionais, relatórios, auditoria e logs.
- `src/app/utils`: permissões, segurança, validações, máscaras, notificações, PDFs, tema e preferências.
- `src/app/i18n`: tradução centralizada para português, inglês e espanhol.
- `src/styles/theme.css`: tokens e identidade visual que devem ser preservados.
- `src/imports`: imagens e material proveniente do protótipo original.
- `tests`: testes Vitest de regras críticas isoladas.

## Tecnologias e bibliotecas principais

- React 18, TypeScript 5.8, Vite 6 e Tailwind CSS 4.
- Radix UI e componentes shadcn derivados; MUI também está instalado.
- Lucide React para ícones e Recharts para gráficos.
- jsPDF e jsPDF-AutoTable para relatórios e recibos.
- Vitest para testes automatizados.
- Não há ESLint, Biome ou outro lint configurado no `package.json`.

## Persistência, autenticação e segurança

- A persistência é exclusivamente local no navegador por `localStorage`.
- `storageService.ts` é o adaptador preferencial e usa memória apenas quando o navegador bloqueia o armazenamento.
- Ainda existem acessos diretos a `localStorage` em 22 arquivos; novas implementações devem evitar ampliar essa dívida.
- Não há API, backend, banco de dados, cookies seguros ou sincronização entre dispositivos.
- A autenticação, o bloqueio de tentativas, os logs e a auditoria são locais e podem ser contornados ou apagados pelo usuário do navegador.
- Senhas locais são armazenadas como hash com salt, mas isso não equivale a autenticação segura de servidor.
- A aplicação cria uma conta inicial de gerência no navegador. Credenciais não devem ser copiadas para este documento.
- Permissões são centralizadas em `utils/permissions.ts` e usadas para controlar telas e ações, mas não são uma barreira de segurança sem backend.
- A elevação temporária para gerência também é local, via `isManagerAuthenticated`.
- `setRolePermissions` é uma função legada vazia; não assumir que ela persiste alterações.
- Dados clínicos e pessoais em `localStorage` não atendem, por si só, aos requisitos de segurança e LGPD para produção.

## Funcionalidades existentes

- Login, logout, cadastro local, recuperação visual de senha e contas salvas.
- Dashboard com indicadores calculados a partir dos dados persistidos.
- Pacientes: cadastro, edição, inativação, histórico, plano e exclusão lógica/desfazer.
- Agenda: disponibilidade profissional, intervalos, bloqueios, afastamentos, ocupação e múltiplos alunos.
- Equipe: cadastro e manutenção de profissionais, dados bancários e comissões.
- Planos, cobranças, financeiro e relatórios em PDF.
- Configurações de perfil, clínica, aparência, usuários, permissões, segurança e idioma.
- Registro de Atividades (identificador técnico e serviço de auditoria preservados), logs de acesso, busca global, alertas e manual interno.
- Temas claro/escuro e interface responsiva.

## Componentes reutilizáveis e pontos de integração

- Reutilizar os componentes em `components/ui` e o padrão visual das telas existentes.
- Usar `NotificationCenter`/`notify` para mensagens novas, evitando introduzir novos `alert()`.
- Usar `storageService` para persistência nova.
- Usar `permissions.ts` para regras de acesso e validar novamente no futuro backend.
- Usar `validators.ts`, `security.ts` e `masks.ts` para entrada de dados.
- Usar os serviços de domínio existentes antes de colocar lógica nova diretamente nos componentes.
- Eventos `pilamanager:*` sincronizam módulos na mesma janela após alterações locais.

## Riscos e dívida técnica conhecidos

- Persistência somente local, sem transações reais, concorrência, backup ou acesso multiusuário.
- Permissões e autenticação somente no cliente.
- Recuperação de senha e envio de e-mail não possuem integração real.
- Uploads ficam no navegador e não possuem armazenamento de objetos.
- Há acessos diretos ao armazenamento fora de `storageService`.
- `PacientesView.tsx`, `PagamentosView.tsx`, `PlanosView.tsx` e `RelatoriosView.tsx` são grandes e têm alto risco de regressão em mudanças amplas.
- `src/imports/AgendamentoPilaManager.tsx` é um artefato grande do protótipo e não é a tela de agenda usada pelo dashboard atual.
- O bundle de gráficos supera 500 kB sem gzip; o build atual passa, mas futuras dependências devem ser avaliadas com cuidado.
- Não existe suíte end-to-end automatizada nem lint configurado.
- Vários fluxos ainda usam `alert()`, embora exista uma ponte de notificações instalada.
- A versão do nome em `.env.example` ainda diz `PilaManager 2.0`.

## Comandos

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 4173
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
npm.cmd run preview
```

O projeto também oferece `Executar.bat` e `Iniciar PilaManager.bat` para iniciar o Vite no Windows.

## Validação da auditoria de 2026-06-29

- `npm.cmd run build`: aprovado; 2.509 módulos transformados.
- `npm.cmd run typecheck`: aprovado.
- `npm.cmd test`: aprovado; 5 arquivos e 13 testes.
- Lint: não executado porque não existe script ou configuração de lint.
- Aplicação executada em `http://127.0.0.1:4173/`.
- Login, logout, novo login e manutenção da sessão após recarregar: aprovados.
- Dashboard e módulos Agendamento, Pacientes, Equipe, Planos, Cobranças, Financeiro e Relatórios abriram sem acionar o Error Boundary.
- Console do navegador: nenhum erro ou aviso durante os fluxos acima.
- Responsividade verificada em 1280x720, 768x1024 e 390x844; não foi detectado overflow horizontal nas páginas verificadas.
- Persistência operacional completa de CRUD não foi reexecutada nesta auditoria para evitar alterar os dados existentes. Os testes automatizados cobrem cadastro de paciente com plano e agenda em armazenamento isolado.

## Evolução funcional de 2026-06-29 — Manual, permissões e Alunos/Planos

### Manual e interface

- O Manual passou a usar conteúdo tipado e manutenível em `src/app/manual/manualContent.ts`, separado do componente visual.
- Há orientações reais por Dashboard, Pacientes, Profissionais, Agendamentos, Planos, Pagamentos/Recibos, Financeiro/Comissões, Relatórios, Usuários, Cargos/Permissões, Configurações/Perfis, Segurança/Idiomas e Registro de Atividades.
- A tela oferece pesquisa textual, filtro por módulo, cards expansíveis, navegação por teclado, estado vazio e conteúdo próprio em português, inglês e espanhol.
- “Auditoria” foi renomeada somente na interface para “Registro de Atividades” (`Activity Log` / `Registro de Actividades`). Identificadores técnicos, chave de armazenamento, serviço e histórico foram preservados.
- O sino estático foi removido do cabeçalho. `NotificationCenter` e `notify` continuam ativos porque são o sistema de mensagens operacionais usado por outras telas.
- A lista de benefícios dos cards de Planos tem altura máxima e rolagem vertical própria, inclusive por teclado e toque; o card inteiro não ganhou rolagem.

### Fonte de verdade Alunos/Planos

- `patientEnrollmentService.ts` é a fonte de verdade para criar, consultar, trocar e encerrar vínculos em `planosAtribuidos`.
- A criação de paciente continua opcionalmente sem plano. Quando há plano, o serviço valida plano ativo e quantidade de aulas, grava paciente, vínculo e cobrança, e restaura os três conjuntos se qualquer gravação local falhar.
- A edição troca o plano por ID, encerra o vínculo ativo anterior, cria no máximo um novo vínculo ativo e sincroniza os campos derivados do paciente.
- A contagem e a lista em Planos usam `membersForPlan()`, excluindo vínculo encerrado/cancelado/vencido, paciente indisponível/ausente e plano inativo/ausente. Chaves compostas evitam contagem duplicada.
- Eventos `pilamanager:data-changed` atualizam Alunos e Planos na mesma janela sem recarregar a página.
- A lista por plano contém pesquisa, avatar quando existente, situação do paciente, situação do vínculo, início e vencimento. A abertura do paciente só é oferecida quando o cargo pode visualizar Pacientes.
- Correção complementar de 2026-06-29: os cards exibem diretamente até três nomes vinculados e acesso à lista completa. Cadastros legados que possuem `planoId/plano` no paciente, mas não possuem `planosAtribuidos`, são migrados uma única vez de forma idempotente. Selecionar novamente o mesmo plano quando o vínculo anterior venceu agora cria uma renovação em vez de reaproveitar o vínculo vencido.
- Não houve migração de banco: não existe banco nesta versão e o modelo `planosAtribuidos` já existia. Registros antigos são preservados.

### Permissões

- `registroAtividades` foi exposto na matriz de Cargos e Permissões e passou a controlar menu e acesso à tela, sem reutilizar indevidamente a permissão restrita de Configurações.
- Em Registro de Atividades, `visualizar` permite consultar as próprias ações; `Dados Restritos` permite visualizar também ações de outros usuários.
- A migração local de cargos completa módulos ausentes com os padrões do cargo, preservando valores previamente salvos. A Gerência mantém acesso total.
- Criação e edição de paciente são verificadas novamente no serviço local além dos botões e da tela. Ações de Planos agora respeitam criar, editar e excluir; a lista de pacientes exige visualizar Pacientes.
- A navegação desta SPA é por estado e não possui URLs internas roteáveis. O bloqueio de página acontece antes da renderização no `Dashboard`; não existe rota HTTP interna para testar por URL.
- Estas verificações são defesa em profundidade apenas dentro das camadas existentes. Sem API/backend, não há como recusar uma operação no servidor nem impedir manipulação direta do `localStorage` pelo dono do navegador.

### Testes desta evolução

- `npm.cmd install`: dependências atualizadas/verificadas; 340 pacotes auditados e nenhuma vulnerabilidade encontrada.
- `npm.cmd run typecheck`: aprovado.
- `npm.cmd test`: aprovado; 7 arquivos e 20 testes. Foram adicionados testes do conteúdo trilíngue do Manual, migração compatível de permissões, troca e renovação de plano, migração de vínculo legado, vínculo único, contagem por vínculo válido e recusa por permissão no serviço.
- `npm.cmd run build`: aprovado; 2.510 módulos transformados.
- `npm.cmd audit --omit=dev`: nenhuma vulnerabilidade encontrada.
- Lint não executado porque o projeto continua sem script ou configuração de lint.
- O servidor local respondeu HTTP 200 em `http://127.0.0.1:4173/` após as alterações.
- O navegador integrado não estava disponível nesta sessão; por isso os 30 testes manuais solicitados, console, dimensões e reteste visual não foram declarados como executados. A validação visual continua pendente em uma sessão com navegador disponível.

## Regras para próximas alterações

1. Antes de editar, localizar o fluxo real, os dados persistidos, as permissões e os testes relacionados.
2. Apresentar diagnóstico objetivo, arquivos envolvidos, risco, solução e plano de testes.
3. Alterar apenas o escopo solicitado e preservar `theme.css`, dados e contratos existentes.
4. Não declarar segurança de servidor, banco de dados, transação ou LGPD enquanto essa infraestrutura não existir.
5. Não usar mocks ou dados fixos como implementação final de funcionalidades operacionais.
6. Executar build, typecheck, testes e validação no navegador; informar com clareza qualquer etapa impossível.
7. Testar e retestar o fluxo alterado, incluindo erro, persistência, permissões e responsividade conforme o impacto.
8. Atualizar este arquivo quando uma mudança alterar arquitetura, contratos, riscos, comandos ou comportamento relevante.

## Pendências de infraestrutura

- Definir e implementar backend, banco de dados e modelo de autenticação seguro.
- Migrar dados locais preservando contratos e registros existentes.
- Aplicar autorização no servidor em todos os endpoints.
- Adicionar lint e testes end-to-end.
- Definir estratégia de backup, auditoria imutável, armazenamento de arquivos e conformidade LGPD.
