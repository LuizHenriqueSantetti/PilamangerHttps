# Banco de dados

A versão publicada usa **PostgreSQL 18.6 no Railway**. Nos testes locais também foi utilizado PostgreSQL 17.

Quando um cadastro é salvo, o servidor confere a conta e suas permissões antes de gravar a informação. Os dados ficam no banco, e não apenas no navegador.

| Tabela | Conteúdo |
| --- | --- |
| `users` | Contas e perfis de acesso. |
| `sessions` | Acessos ativos. |
| `login_attempts` | Tentativas de entrada. |
| `audit_logs` | Histórico de ações. |
| `app_storage` | Dados dos módulos, como pacientes, agenda e pagamentos. |
| `file_objects` | Arquivos enviados. |
| `demo_import_runs` | Controle da inclusão de dados de demonstração. |
| `schema_migrations` | Atualizações da estrutura do banco. |

Os arquivos que criam o banco estão em [postgres](../postgres). A aplicação usa o espaço `pilamanager_nova_experiencia` para separar suas tabelas.

Os dados dos módulos ainda são agrupados em `app_storage`, no formato JSON. Separar pacientes, planos, agenda e pagamentos em tabelas próprias é uma melhoria futura.

Senhas e cópias do banco ficam fora do GitHub. A demonstração usa dados fictícios.
