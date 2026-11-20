# PilaManager

Sistema de gestão para estúdios de Pilates, desenvolvido ao longo do semestre.

O PilaManager reúne a agenda, os pacientes, a equipe e os pagamentos em um só lugar. A proposta é facilitar a rotina do estúdio e permitir que as informações de um cadastro sejam aproveitadas nas outras partes do sistema.

Por exemplo: ao cadastrar um paciente com um plano, o sistema cria o vínculo e a cobrança. Depois do recebimento, o valor aparece no Financeiro e nos relatórios.

## Links do projeto

- [Acessar o PilaManager](https://pilamanager-web-production.up.railway.app/)
- [Acompanhar as tarefas no Trello](https://trello.com/b/tFTm4z72/pilamanager-21)
- [Repositório no GitHub](https://github.com/LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres)

A versão publicada é uma demonstração com dados fictícios. O acesso é feito com uma conta autorizada; senhas não ficam no repositório.

![Visão geral do PilaManager com dados de demonstração](docs/imagens/visao-geral.jpg)

## O que o sistema faz

| Área | O que é possível fazer |
| --- | --- |
| Pacientes | Cadastrar, editar, acompanhar o histórico e vincular um plano. |
| Equipe | Cadastrar profissionais, horários disponíveis e regras de comissão. |
| Agenda | Organizar os atendimentos e consultar horários disponíveis. |
| Planos | Definir os serviços, o valor, a duração e a quantidade de aulas. |
| Cobranças | Acompanhar o que está pendente e registrar recebimentos. |
| Comissões | Calcular os valores das aulas e acompanhar os pagamentos aos profissionais. |
| Financeiro | Consultar entradas, saídas e saldo. |
| Relatórios | Filtrar informações e gerar relatórios e recibos em PDF. |
| Usuários | Separar o acesso de gerência, administração, recepção e fisioterapeutas. |

O sistema também tem busca, modo claro e escuro e telas adaptadas para celular.

## Ferramentas usadas

| Ferramenta | Como entrou no projeto |
| --- | --- |
| [Trello](https://trello.com/b/tFTm4z72/pilamanager-21) | Organização das tarefas e acompanhamento do trabalho do semestre. |
| [Figma Make](https://www.figma.com/make/) | Base das primeiras telas e de componentes do protótipo. |
| Git e GitHub | Histórico das alterações e organização do código. |
| PostgreSQL | Banco de dados usado na versão publicada. |
| Railway | Hospedagem da aplicação e do banco de dados. |
| ChatGPT e Codex | Apoio na organização das ideias, na programação, na revisão de erros e nos testes. |

A aplicação usa TypeScript, React, Next.js, Node.js e Tailwind CSS. Os testes usam Vitest, e a publicação automática é feita pelo GitHub Actions. O Docker organiza o ambiente usado para colocar a aplicação no ar.

Os detalhes de cada ferramenta estão em [Ferramentas do projeto](docs/projeto/FERRAMENTAS.md).

## Banco de dados

A versão atual usa **PostgreSQL no Railway**. Os dados ficam no servidor, para que o acesso não dependa de um único navegador.

Usuários, acessos, registros de alterações e arquivos têm suas próprias tabelas. Os cadastros e as movimentações ainda são guardados em grupos por módulo, na tabela `app_storage`. Essa parte continua como um ponto de evolução do projeto.

[Entenda como os dados são guardados](docs/projeto/BANCO_DE_DADOS.md).

## Como o repositório está organizado

| Pasta | Conteúdo |
| --- | --- |
| `src/app` | Telas, regras de funcionamento e componentes do sistema. |
| `src/styles` | Cores, estilos e adaptação das telas. |
| `app/api` | Recebe os pedidos da aplicação e confere o acesso aos dados. |
| `src/server` | Regras executadas no servidor, como login e permissões. |
| `postgres` | Arquivos que criam e atualizam o banco atual. |
| `tests` | Testes automatizados. |
| `scripts` | Rotinas de apoio para publicação, banco e backup. |
| `docs` | Apresentação, ferramentas, banco e orientações de uso. |
| `.github/workflows` | Verificações e publicação automática pelo GitHub. |

## Para conhecer ou executar o projeto

- [Apresentação e principais fluxos](docs/projeto/APRESENTACAO.md)
- [Ferramentas usadas durante o desenvolvimento](docs/projeto/FERRAMENTAS.md)
- [Banco de dados](docs/projeto/BANCO_DE_DADOS.md)
- [Como executar no computador](docs/tecnica/COMO_RODAR.md)
- [Testes realizados e limites da versão](docs/VALIDACAO_RAILWAY_NOVA_EXPERIENCIA.md)
- [Índice da documentação](docs/README.md)

A última conferência registrada, em **20/11/2026**, teve 114 testes automatizados aprovados. Também foram feitos testes com o banco, com as contas de acesso e com os relatórios em PDF. O relatório acima explica o que foi testado e o que ainda precisa evoluir.

## Autoria

Projeto de **Luiz Henrique Santetti**.

Os créditos de componentes e materiais da base visual estão em [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
