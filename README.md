# PilaManager

Sistema de gestão para estúdios de Pilates, desenvolvido durante o semestre. Reúne pacientes, equipe, agenda, planos, cobranças, comissões e relatórios.

## Links

- [Acessar o sistema](https://pilamanager-web-production.up.railway.app/)
- [Quadro do Trello](https://trello.com/b/tFTm4z72/pilamanager-21)
- [GitHub do projeto](https://github.com/LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres)

## Funcionamento

O cadastro de um paciente com plano gera o vínculo e a cobrança. A agenda considera os horários dos profissionais. Recebimentos e comissões aparecem no Financeiro e nos relatórios em PDF.

Cada conta tem um perfil de acesso. O sistema funciona no computador e no celular, com modo claro e escuro.

## Ferramentas utilizadas

- **Trello:** organização das tarefas do semestre.
- **Figma Make:** base das primeiras telas do protótipo.
- **Git e GitHub:** código e histórico das alterações.
- **TypeScript, React, Next.js e Tailwind CSS:** programação e telas.
- **Node.js e PostgreSQL:** funcionamento no servidor e armazenamento dos dados.
- **Railway, Docker e GitHub Actions:** hospedagem e publicação automática.
- **ChatGPT e Codex:** apoio ao desenvolvimento e à revisão do projeto.

O banco atual é PostgreSQL, hospedado no Railway. Os cadastros dos módulos ficam agrupados na tabela `app_storage`, em formato JSON. Separar cada módulo em uma tabela própria é uma melhoria futura.

## Executar no computador

É necessário ter Node.js 22, pnpm e um banco PostgreSQL de teste. Copie `.env.example` para `.env` e preencha o endereço do banco em `DATABASE_URL`.

Para criar uma conta fictícia local, configure `DEMO_MODE=true`, `DEMO_ADMIN_EMAIL` e `DEMO_ADMIN_PASSWORD`. Use uma senha de pelo menos 16 caracteres, com maiúsculas, minúsculas, números e símbolo.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
node scripts/bootstrap-postgres.mjs
pnpm dev
```

Abra http://127.0.0.1:3102 com a conta configurada. As atualizações do banco ficam em `postgres`; as telas e regras do sistema ficam em `src/app`.

A versão publicada é de demonstração, com dados fictícios e acesso por conta autorizada. Senhas e configurações locais ficam fora do GitHub.

## Autoria e créditos

Projeto de **Luiz Henrique Santetti**.

Créditos da base original do Figma Make: componentes [shadcn/ui](https://ui.shadcn.com/) sob a [licença MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) e imagens [Unsplash](https://unsplash.com), conforme sua [licença](https://unsplash.com/license).
