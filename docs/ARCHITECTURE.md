# Como o sistema funciona

O PilaManager tem três partes principais:

1. **As telas**, feitas com React e Next.js, que aparecem no navegador.
2. **O servidor**, executado com Node.js, que recebe os pedidos e confere o acesso de cada conta.
3. **O PostgreSQL**, que guarda as informações.

O Railway hospeda a aplicação e o banco. O acesso ao sistema é feito por HTTPS.

## Um pedido de gravação

Ao salvar um cadastro, a tela envia as informações para uma rota em `app/api`. O servidor verifica a sessão, as permissões e o conteúdo recebido antes de gravar no banco. As regras de apoio ficam em `src/server`.

As telas e suas regras de uso ficam em `src/app`. Algumas informações são mantidas temporariamente no navegador para exibição, mas o banco do servidor é a referência dos registros.

## Organização dos dados

Contas, sessões e histórico de ações possuem tabelas próprias. Os dados dos módulos ainda são agrupados em `app_storage`. Essa estrutura mantém a compatibilidade com as telas e pode ser evoluída para tabelas separadas.

[Explicação do banco de dados](projeto/BANCO_DE_DADOS.md)

## Etapas anteriores

A base inicial usava React e Vite. Depois, houve uma versão com Vinext e Cloudflare D1 no Sites. A publicação atual usa Next.js e PostgreSQL. Por isso, as pastas `db` e `drizzle` e alguns registros antigos fazem referência ao D1.
