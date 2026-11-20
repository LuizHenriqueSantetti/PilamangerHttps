# Notificações globais — Nova Experiência

Implementação de 20/10/2026, somente nesta versão. Nenhuma migration ou mudança de acesso ao Site foi necessária.

## Padrão

- Componente único: NotificationCenter; API em utils/notifications.ts.
- Topo central, até três mensagens, quatro segundos mais saída suave.
- Sucesso, erro, aviso e informação; temas claro/escuro; largura responsiva.
- Leitores de tela via status/alert; botão de fechar; sem deslocar o foco.
- Movimento reduzido respeitado. Confirmações visuais usam foco inicial no Cancelar, Escape e contenção do Tab.
- Erros de banco/conexão são tratados; mensagens removem e-mail, CPF e detalhes técnicos conhecidos.

## Contrato de gravação

performAction aguarda a operação e flushRemoteStorage antes de anunciar sucesso. Bloqueia operações simultâneas com a mesma chave. Formulários só fecham após confirmação.

performActionWithResult retém o resultado de uma escrita que ficou pendente após falha de conexão. A próxima tentativa confirma essa mesma escrita sem executar novamente o cadastro. Esse estado é descartado na limpeza da sessão/cache.

O indicador de falha do cabeçalho permite reenviar escritas pendentes. Não se deve fechar a página com alterações pendentes: o navegador recebe proteção de saída, mas esse mecanismo não substitui backup nem oferece armazenamento offline.

Os cadastros existentes de pacientes, profissionais, planos, agenda, usuários, perfil, clínica, cargos e regras de comissão utilizam o padrão. Recebimentos, apuração e pagamento de comissão continuam no endpoint financeiro autenticado. Alertas legados de validação passam pela ponte central.

## PDFs

savePdfDocument valida o blob antes de solicitar o arquivo. Os recibos individuais mantêm a entrega por blob. A mensagem é “PDF gerado e preparado para download”; não afirma que o usuário concluiu o download.

## Verificações realizadas

- 55 testes automatizados passaram: incluem regressões existentes de segurança, pacientes/planos, disponibilidade, permissões, PDF e sincronização; novos testes de fila, deduplicação, duração, fechamento, falhas, cliques repetidos, confirmação, mensagens seguras, recuperação sem recriar cadastro, senha/rede e armazenamento indisponível.
- Typecheck sem erros.
- Integração financeira local: 17 verificações, incluindo recebimento, apuração, pagamento, bloqueio de duplicidade, restrições de escrita e persistência após novo login.
- Navegador local: plano fictício criado, ativado/desativado; cancelamento de confirmação; avisos de cadastro inválido de plano, profissional, paciente e agendamento.
- Verificação visual clara/escura e viewport 390 × 844; capturas ignoradas pelo Git em test-results/.
- PDF financeiro gerado na interface, evento de download recebido; recibo com blob válido também coberto por teste automatizado.

Esses resultados não equivalem a homologação completa de todas as combinações de formulários, perfis e dispositivos. Não foram usados pacientes reais nem executadas transações de teste no banco publicado.

## Limites existentes, não ocultados por notificações

- A tela analítica antiga de pagamentos possuía alteração de status apenas em memória. Essa ação agora orienta a usar Comissionamento, que possui operação validada no servidor, sem alegar uma gravação inexistente.
- “Fechar período” nessa tela continua sendo bloqueio visual da sessão, agora descrito explicitamente. Não existe fechamento contábil persistente nessa função.
- A arquitetura mantém coleções JSON operacionais no D1 e cache local. Esta alteração não transforma essas coleções em tabelas relacionais nem resolve todos os riscos de edição concorrente.
- Não existem todas as ações citadas como exemplo no pedido (por exemplo, formulário independente de despesa e registro separado de falta). Não foram criadas funções fictícias.
- Alteração real de senha e administração completa de usuários/permissões não foram repetidas manualmente no navegador desta rodada; os limites de erro de senha/rede e os testes existentes passaram.
- Não há comando de lint configurado neste projeto; foram usados typecheck, testes e build.
