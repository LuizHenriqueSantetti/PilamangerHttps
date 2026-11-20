# Como executar no computador

Este guia é para abrir uma cópia de teste do PilaManager no próprio computador. Para apenas conhecer a demonstração, use o [endereço publicado](https://pilamanager-web-production.up.railway.app/).

## O que precisa estar instalado

- Node.js 22.
- pnpm, na versão indicada em `package.json`.
- PostgreSQL, com um banco vazio destinado ao teste.
- Git, para baixar o repositório.

## 1. Baixar o projeto

```sh
git clone https://github.com/LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres.git
cd pilamanager-nova-experiencia-postgres
pnpm install --frozen-lockfile
```

O repositório é privado, então é necessário ter acesso à conta ou ser convidado para ele.

## 2. Preparar as configurações

Faça uma cópia de `.env.example` e dê a ela o nome `.env`.

Nesse arquivo, preencha `DATABASE_URL` com o endereço do PostgreSQL que você preparou. O formato é:

```text
DATABASE_URL=postgresql://SEU_USUARIO:SUA_SENHA@127.0.0.1:5432/pilamanager
```

Os trechos em maiúsculas são exemplos para substituir pelos seus dados. Não use a senha da demonstração publicada.

Para criar uma conta fictícia local, configure também:

```text
PG_SCHEMA=pilamanager_nova_experiencia
PUBLIC_ORIGIN=http://127.0.0.1:3102
PORT=3102
DEMO_MODE=true
DEMO_ADMIN_EMAIL=gestao.demo@example.invalid
DEMO_ADMIN_PASSWORD=
```

No campo da senha, escolha uma senha de teste com pelo menos 16 caracteres, incluindo letras maiúsculas, minúsculas, números e um símbolo. Não deixe o campo vazio. O arquivo `.env` não deve ser enviado ao GitHub.

## 3. Criar as tabelas e a conta de teste

```sh
pnpm db:migrate
node scripts/bootstrap-postgres.mjs
```

O primeiro comando prepara as tabelas. O segundo cria a conta fictícia definida no arquivo `.env`, quando `DEMO_MODE` está ativado.

## 4. Abrir o sistema

```sh
pnpm dev
```

Abra http://127.0.0.1:3102 e entre com a conta fictícia configurada.

## Verificações disponíveis

| Comando | O que confere |
| --- | --- |
| `pnpm test` | Os testes automatizados. |
| `pnpm typecheck` | Inconsistências nos tipos usados pelo código. |
| `pnpm build` | Se a aplicação pode ser preparada para publicação. |
| `pnpm audit --prod` | Alertas conhecidos nas bibliotecas de produção. |

[Informações sobre publicação e backup](EXECUCAO_E_PUBLICACAO.md)
