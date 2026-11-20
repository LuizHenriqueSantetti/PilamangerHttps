# PilaManager — Nova Experiência no Railway

Cópia da fonte exata indicada pelo proprietário: versão 13 do Site
https://pilamanager-nova-experiencia.luizsantetti.chatgpt.site/,
commit de origem `184b6ea9e5aa24f18ec55cbecb1c35c5f59ea5cb`.
O Site original e seu banco não foram alterados nem tiveram dados importados.

Esta cópia usa Next.js/Node 22, React e PostgreSQL. Os componentes e estilos
originais foram preservados. O adaptador em `src/server/runtime.ts` mantém
os contratos existentes das APIs; sessões, usuários, auditoria e objetos de
imagem ficam no PostgreSQL. Os módulos operacionais mantêm o modelo original
de coleções JSON em `app_storage`, sem normalização relacional completa.

Publicação de demonstração: https://pilamanager-web-production.up.railway.app/
Somente dados fictícios. Consulte [o relatório desta validação](docs/VALIDACAO_RAILWAY_NOVA_EXPERIENCIA.md).
Os demais documentos sobre Workers/D1 são registros históricos da origem.

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
O trial não oferece criação de backups automáticos nesta conta; foi produzido e
restaurado um dump manual de demonstração, guardado em `.private/` fora do Git.
O script `verify-backup-local.mjs` restaura esse dump somente em banco temporário
local e remove exclusivamente o banco temporário que ele próprio cria.

A publicação usa upload autenticado pela CLI oficial. O repositório é privado;
a conexão de autodeploy pelo GitHub depende de permissão adicional do Railway
GitHub App e não foi habilitada. Não publique `.env*`, `.private/`, dumps ou chaves.
