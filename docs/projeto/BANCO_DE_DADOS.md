# Banco de dados do PilaManager

A aplicação publicada usa **PostgreSQL 18.6 no Railway**. Nos testes locais também foi usado PostgreSQL 17.

## Como funciona

Quando uma pessoa salva um cadastro, a tela envia o pedido ao servidor. O servidor confere se ela está conectada e se tem permissão para fazer a alteração. Depois, grava a informação no PostgreSQL.

O navegador mantém uma cópia de algumas informações para exibir as telas, mas o banco no servidor é a referência dos dados. Sair da conta e abrir o sistema novamente não apaga os registros salvos.

## O que fica no banco

| Tabela | Para que serve |
| --- | --- |
| `users` | Contas dos usuários e seus perfis de acesso. |
| `sessions` | Controle dos acessos que estão ativos. |
| `login_attempts` | Registro das tentativas de entrada no sistema. |
| `audit_logs` | Histórico de alterações e ações realizadas. |
| `app_storage` | Grupos de dados dos módulos, como pacientes, planos, agenda e pagamentos. |
| `file_objects` | Arquivos enviados para a aplicação. |
| `demo_import_runs` | Controle das operações de inclusão de dados de demonstração. |
| `schema_migrations` | Registro das atualizações aplicadas à estrutura do banco. |

As contas se relacionam com as sessões e com o histórico de ações. As tabelas são criadas pelos arquivos da pasta [postgres](../../postgres) e pela rotina de atualização do banco.

## Como os cadastros são guardados hoje

Pacientes, profissionais, planos, agenda e pagamentos ainda não têm uma tabela separada para cada um. Esses dados ficam agrupados por módulo em `app_storage`, em um formato de texto organizado chamado JSON.

Isso manteve a compatibilidade com as telas que já existiam. Separar esses módulos em tabelas próprias é uma melhoria prevista para a continuidade do projeto. Portanto, este repositório não apresenta essa separação como algo já concluído.

A aplicação usa um espaço próprio no PostgreSQL chamado `pilamanager_nova_experiencia`. Esse nome serve para manter suas tabelas separadas de outras aplicações que possam estar no mesmo banco.

## Versões anteriores

A versão do Sites usava Cloudflare D1, baseado em SQLite. Os arquivos de `db` e `drizzle` registram essa etapa. Eles não são os arquivos usados para criar o PostgreSQL da publicação atual.

## Cópias de segurança

Foi testada a criação de uma cópia do banco e sua restauração em um banco local separado. Também foi configurada uma rotina diária às 21h, que depende do computador e do Codex disponíveis.

As cópias do banco e as senhas ficam fora do GitHub. A aplicação de demonstração usa dados fictícios.

[Consultar os testes e os limites da versão](../VALIDACAO_RAILWAY_NOVA_EXPERIENCIA.md)
