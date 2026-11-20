# Ferramentas do projeto

Esta página reúne as ferramentas usadas na organização, na criação das telas, na programação e na publicação do PilaManager.

## Organização do trabalho

**Trello** foi usado para organizar as tarefas e acompanhar o andamento do projeto durante o semestre.

[Quadro do PilaManager 2.1](https://trello.com/b/tFTm4z72/pilamanager-21)

**Git e GitHub** guardam o código e o histórico das alterações. Isso permite consultar o que mudou entre uma versão e outra.

[Repositório do PilaManager](https://github.com/LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres)

## Telas e protótipo

**Figma Make** aparece na origem das primeiras telas e de componentes do protótipo. Os créditos dessa base foram mantidos no [arquivo de atribuições](../../ATTRIBUTIONS.md).

[Conhecer o Figma Make](https://www.figma.com/make/)

**React e Next.js** são usados para construir as telas e ligar suas ações ao servidor. **Tailwind CSS** ajuda a manter o padrão visual e a adaptação para telas menores. **Lucide** fornece ícones, e **Recharts** é usado nos gráficos.

## Programação e banco

**TypeScript e JavaScript** são as linguagens usadas no código. **Node.js** executa a aplicação no servidor, e **pnpm** instala as bibliotecas e executa os comandos do projeto.

**PowerShell** foi usado para executar comandos, iniciar o ambiente de teste e trabalhar com as rotinas no Windows.

**PostgreSQL** é o banco da versão atual. Ele guarda os dados da aplicação no Railway. A primeira versão publicada no Sites utilizava **Cloudflare D1**, baseado em SQLite; essa foi uma etapa anterior, preservada nos registros do desenvolvimento.

[Ver a explicação do banco atual](BANCO_DE_DADOS.md)

## Publicação e testes

| Ferramenta | Uso no PilaManager |
| --- | --- |
| Railway | Mantém a aplicação e o PostgreSQL disponíveis pela internet. |
| Docker | Prepara o ambiente em que a aplicação é publicada. |
| GitHub Actions | Confere o código e publica as alterações depois que as verificações passam. |
| Vitest | Executa os testes automatizados das regras do sistema. |
| jsPDF e AutoTable | Geram relatórios e recibos em PDF. |

Além dos testes automatizados, foram feitos testes no navegador e verificações de gravação e leitura no PostgreSQL.

## Apoio ao desenvolvimento

**ChatGPT e Codex** foram usados como apoio para organizar ideias, trabalhar no código, investigar erros, executar testes e preparar a publicação. As alterações e os resultados das verificações ficam registrados no GitHub e na documentação.

## Do protótipo à versão atual

O projeto passou por uma base com React e Vite, por uma publicação no Sites com Vinext e Cloudflare D1 e, depois, pela versão atual com Next.js e PostgreSQL no Railway. Esses nomes aparecem em arquivos de etapas anteriores, mas o banco usado pela aplicação publicada hoje é o PostgreSQL.

[Voltar para a apresentação do repositório](../../README.md)
