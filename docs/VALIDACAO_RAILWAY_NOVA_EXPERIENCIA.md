# PilaManager Nova Experiência — relatório final de validação

Data: 20/11/2026 (America/Sao_Paulo).
Endereço: https://pilamanager-web-production.up.railway.app/
Repositório privado: https://github.com/LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres

## Fonte e preservação

A fonte é a versão 13 do Site indicado pelo proprietário,
https://pilamanager-nova-experiencia.luizsantetti.chatgpt.site/,
commit original `184b6ea9e5aa24f18ec55cbecb1c35c5f59ea5cb`.
Os resultados do ZIP anterior não foram usados como aprovação desta fonte.
O Site original permaneceu intacto e seus dados e contas não foram importados.

A cópia Railway usa Next.js 16.4.5, React 19.2.9 e PostgreSQL, com o schema
isolado `pilamanager_nova_experiencia`. O design, os estilos e a navegação foram
preservados. As alterações posteriores na interface corrigiram cálculos, datas
ou textos dos relatórios; não houve redesenho.

## Testes executados de verdade

- 114 testes automatizados, em 23 arquivos, aprovados na versão final local.
  Parte da suíte é unitária e usa mocks; isso não equivale a integração real.
- Instalação de dependências, TypeScript e build aprovados.
- Auditoria de dependências de produção após atualização: zero alertas conhecidos
  no momento da consulta. O CI também impede publicação com alertas altos/críticos.
- PostgreSQL local real iniciado, migrations e seed fictício executados.
- 62 verificações HTTP locais: persistência de coleções, sessão, logout, origem,
  permissões, inativação, senha temporária e bloqueio após falhas de login.
- 17 verificações financeiras e seis do adaptador PostgreSQL aprovadas,
  incluindo duplicidades, cálculo de comissão, transações com rollback,
  parâmetros SQL, persistência de arquivos e leitura por nova conexão.
- 47 verificações HTTPS na fonte correta, usando gestão e recepção fictícias.
  Foram conferidos Secure, HttpOnly, SameSite=Lax, HSTS, permissões e persistência.
- 20 verificações após troca de implantação: as duas contas, paciente,
  recebimento e comissão paga persistiram; sessão revogada e restrições da
  recepção foram verificadas novamente.
- PostgreSQL online consultado diretamente por SSH: versão 18.6, schema
  isolado, migration registrada e dados de demonstração presentes.

## Formulários e PDFs

Na interface local ligada ao PostgreSQL, foram realizados:
criação e edição de plano; cadastro de profissional com comissão de 30% e
turno; cadastro de paciente com plano, vínculo e cobrança de R$ 320; agendamento
em horário futuro permitido; confirmação e cancelamento com confirmação
explícita; recebimento da cobrança e reflexo no Financeiro.
Também foi conferida a persistência do paciente após reiniciar a aplicação.

Foram baixados pelo navegador dez PDFs: financeiro completo, recibo individual,
e as oito categorias de Relatórios (geral, pacientes, agendamentos, faltas,
comissões, receitas, despesas e planos). Todos foram abertos, tiveram texto
extraído e páginas renderizadas para inspeção visual. Os valores fictícios
R$ 800 de receitas, R$ 18 de despesas e R$ 782 de saldo foram reconciliados.
O recibo de R$ 320 e a data civil 20/11/2026 foram conferidos.
Uma exportação adicional foi feita no HTTPS publicado e renderizada: receitas
R$ 240, despesas R$ 9 e saldo R$ 231, com a mesma data 20/11/2026 da tela.

Falhas encontradas e corrigidas:

- Datas de transações no PDF apareciam um dia antes no fuso brasileiro.
- O cabeçalho do PDF era substituído por um título genérico.
- Totais financeiros mensais eram usados com lançamentos de outros períodos.
- Indicadores de confirmação/cancelamento ainda continham números fixos.
- Filtros de período e agrupamentos deslocavam datas civis para o dia/mês anterior.
- Aulas podiam ser contadas duas vezes em relatórios de profissionais homônimos.
- Percentuais de planos usavam denominador diferente do total de vínculos.
- A legenda de assinatura do recibo podia ficar branca e invisível.
- Foi evitada divisão por zero e normalizada a exibição de percentuais.
- Os rótulos das transações na tela móvel foram corrigidos para Tipo, Data,
  Descrição, Categoria e Valor, sem alterar cores ou estrutura dos cartões.

Há testes de regressão para datas civis, limites do período, meses diferentes,
filtros financeiros, profissionais homônimos, vínculos e dados vazios.

## Publicação automática

GitHub Actions foi configurado e executado de verdade. Cada push de código na
main passa por testes, TypeScript, auditoria e build antes da publicação pela
CLI oficial. O fluxo aguarda SUCCESS no Railway e confere a API HTTPS correta
com PostgreSQL e bloqueio de acesso sem autenticação.

O proprietário autorizou expressamente a credencial restrita ao projeto e ao
ambiente production. Seu escopo foi verificado antes de gravá-la no secret
RAILWAY_TOKEN do repositório privado. O arquivo temporário foi removido e o
valor não foi exibido nem adicionado ao Git. Não foi necessário ampliar acesso
do Railway GitHub App a outros repositórios.

## Backups

A criação de backups nativos do Railway exigiu Pro nesta conta; nenhum plano
pago foi ativado. Foi configurada uma alternativa local pelo Codex:

- Automação ativa: Backup diário do PilaManager, diariamente às 21h, fuso de São Paulo.
- Script: scripts/backup-railway.mjs.
- Copia somente o schema desta aplicação para .private/backups/.
- Valida o arquivo com pg_restore e registra data, tamanho e SHA-256.
- Não apaga backups anteriores e não exibe conteúdo do banco ou credenciais.
- A rotina foi executada manualmente com sucesso. Esse novo dump de 19.262 bytes
  foi restaurado de verdade em PostgreSQL 17 local temporário, com duas contas
  e paciente fictício conferidos. O banco temporário foi removido após o teste.
- SHA-256 dessa execução:
  eadd2ba6ef667f1502354d37fad915e024d3a74e5cc8fe0c71d324e66056982b.

A primeira execução agendada futura ainda não foi observada. A rotina depende
deste computador/Codex disponíveis, autenticação, rede e créditos Railway.
Não equivale a backup gerenciado independente do computador ou recuperação
pontual. Os dumps e as chaves ficam fora do Git.

## Aparelhos, domínio e prazo gratuito

O proprietário informou que já realizou os testes nos aparelhos. Esse item foi
registrado como concluído pelo usuário, sem alegar execução física pelo agente.
Também houve teste próprio em viewport móvel emulado de 390x844.

O proprietário escolheu manter o endereço gratuito do Railway com HTTPS.
Portanto, domínio próprio não é mais uma pendência desta entrega. Nada foi comprado.

A hospedagem permanece no trial existente. Depois do prazo ou dos créditos,
a continuidade precisa ser tratada no painel: a documentação atual prevê
transição para Free e redeploy, com crédito mensal e suspensão ao atingir seu
limite, ou contratação de outro plano. Não foi antecipado um downgrade que
encerrasse o teste, nem autorizado qualquer pagamento. Não há promessa de
operação ininterrupta e gratuita após o trial.
Referência: https://docs.railway.com/pricing/free-plan

## Limites desta validação

Os cenários acima foram efetivamente exercitados; não se afirma teste de toda
combinação de dados ou de todos os formulários secundários. Não houve pentest,
teste de carga, ensaio de recuperação de desastre com indisponibilidade total,
certificação LGPD ou aprovação irrestrita para uso clínico com dados reais.
Coleções operacionais mantêm o formato JSON original em app_storage, sem
normalização relacional completa. Relatórios extensos com muitas páginas e
intervalos de vários anos não foram homologados exaustivamente.

A implantação continua de demonstração. As contas fictícias e DEMO_MODE não
substituem o preparo de contas definitivas antes de eventual uso com dados reais.
Evidências detalhadas: test-results/ local (ignorado pelo Git).
Credenciais: .private/ACESSO_DEMONSTRACAO.txt (ignorado pelo Git).

## Confirmação final da entrega

- Commit de código publicado: `4026756bad34d902e089796d7f5a0506c26db5fb`.
- Execução CI/CD final concluída com sucesso:
  https://github.com/LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres/actions/runs/44833332865
- Implantação Railway: `223abb3c-044f-466a-be81-78b868fd8f20`.
- As 20 verificações posteriores à implantação foram repetidas com sucesso.
- Os cinco rótulos móveis foram conferidos no HTTPS real, em viewport natural
  de 544x1074: Tipo, Data, Descrição, Categoria e Valor. Os textos calculados
  pelo CSS foram comparados com os rótulos esperados.
- Captura final: `test-results/publicacao-final-financeiro.jpg`.
- A primeira execução futura agendada do backup permanece futura; sua rotina
  foi testada agora, sem afirmar que um agendamento ainda não ocorrido executou.
