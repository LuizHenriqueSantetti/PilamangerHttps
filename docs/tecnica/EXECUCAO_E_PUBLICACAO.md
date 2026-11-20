# Execução, publicação e backup

Este guia reúne os comandos e as configurações da versão atual no Railway. Para começar, veja [Como executar no computador](COMO_RODAR.md).

## Executar

Requisitos: Node 22 e pnpm (versão registrada em `packageManager`).
Copie `.env.example` para `.env` e configure um PostgreSQL de teste.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

A migration cria somente o schema `pilamanager_nova_experiencia` por padrão.
Não reutilize um schema de outra aplicação. Migrations PostgreSQL ficam em
`postgres/`; `drizzle/` descreve o histórico D1 da origem e não é executado no Railway.

Para produção, use o Dockerfile. A inicialização aplica migrations idempotentes,
executa o seed apenas com `DEMO_MODE=true` e inicia o servidor na porta `PORT`.
Defina `PUBLIC_ORIGIN` para o endereço HTTPS exato e `DATABASE_URL` para a rede
privada PostgreSQL do Railway. Segredos nunca entram no Git ou na imagem.

## Verificação

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
```

Scripts `verify-local-api.mjs` e `verify-billing-local.mjs` aceitam somente
localhost e exigem `.private/qa.json` com contas fictícias. `verify-https.mjs`
aceita apenas o endereço desta demonstração e lê credenciais locais ignoradas.
Os testes HTTP complementam os testes unitários; não são uma certificação de
segurança ou homologação clínica completa. O projeto não possui ESLint configurado.

## Operação e backup

Não foi ativado plano pago. O endereço Railway fornece HTTPS sem compra de domínio.
O trial não oferece backups nativos nesta conta. Foi configurado um backup
diário local pelo Codex às 21h (America/Sao_Paulo), com `scripts/backup-railway.mjs`.
Depende deste computador/Codex disponíveis, rede e autenticação Railway ativa.
Cada dump fica em `.private/backups/`, é validado com pg_restore e recebe SHA-256.
Nenhum backup é apagado automaticamente. Uma execução já foi restaurada de verdade.
O script `verify-backup-local.mjs` restaura esse dump somente em banco temporário
local e remove exclusivamente o banco temporário que ele próprio cria.

A publicação automática usa GitHub Actions e a CLI oficial após testes, TypeScript,
auditoria de produção e build. O proprietário autorizou uma credencial limitada
ao projeto/ambiente production, guardada somente no secret `RAILWAY_TOKEN` do
repositório privado. O fluxo aguarda o Railway ficar saudável e confere HTTPS e
autenticação. A primeira execução real passou. Não há dependência de autorizar
o Railway GitHub App. Não publique `.env*`, `.private/`, dumps ou chaves.

O trial termina ao consumir os créditos ou o prazo. Nenhum plano pago foi ativado.
O plano Free exige transição pelo painel e redeploy; tem limites e pode suspender
o serviço quando seu crédito mensal acaba. Isso não é garantia de operação contínua.
