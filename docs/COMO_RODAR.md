# Como executar

É necessário ter Git, Node.js 22, pnpm e um PostgreSQL preparado para teste.

## Baixar e instalar

```sh
git clone https://github.com/LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres.git
cd pilamanager-nova-experiencia-postgres
pnpm install --frozen-lockfile
```

O repositório é privado e exige permissão de acesso.

## Configurar

Copie `.env.example` para `.env`. Preencha o endereço do seu PostgreSQL, seguindo este formato:

```text
DATABASE_URL=postgresql://SEU_USUARIO:SUA_SENHA@127.0.0.1:5432/pilamanager
```

Para criar uma conta fictícia local, configure `DEMO_MODE=true`, `DEMO_ADMIN_EMAIL` e `DEMO_ADMIN_PASSWORD`. Escolha uma senha com pelo menos 16 caracteres, usando maiúsculas, minúsculas, números e símbolo. Não envie o arquivo `.env` ao GitHub.

## Iniciar

```sh
pnpm db:migrate
node scripts/bootstrap-postgres.mjs
pnpm dev
```

Abra http://127.0.0.1:3102 e entre com a conta fictícia configurada.

## Conferir o código

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm audit --prod
```
