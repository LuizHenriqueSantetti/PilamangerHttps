# Regras permanentes de manutenção do PilaManager

Antes de qualquer alteração, leia este arquivo, a documentação do projeto e o histórico relacionado à funcionalidade.

1. Analise a arquitetura antes de alterar qualquer funcionalidade.
2. Altere somente o escopo solicitado.
3. Preserve as funcionalidades existentes.
4. Não altere o design sem solicitação.
5. Evite alterações desnecessárias.
6. Não entregue funcionalidades incompletas.
7. Teste cada implementação.
8. Valide front-end e back-end quando ambos existirem.
9. Utilize dados reais do sistema.
10. Não utilize mocks em funcionalidades finais.
11. Mantenha o código limpo e seguro.
12. Evite duplicação.
13. Preserve a compatibilidade com decisões anteriores.
14. Revise a documentação antes de cada nova alteração.
15. Não repita erros já corrigidos.
16. Não reescreva arquivos inteiros sem necessidade.
17. Não afirme que algo funciona sem testar.
18. Registre alterações relevantes para evitar regressões futuras.
19. Execute build, lint e testes disponíveis antes de concluir.
20. Respeite os padrões existentes do projeto.

## Arquitetura atual e limites de segurança

Esta cópia autorizada para Railway usa Next.js/Node e PostgreSQL, em schema separado
`pilamanager_nova_experiencia`. A origem é a versão 13 do Site Nova Experiência,
commit 184b6ea9e5aa24f18ec55cbecb1c35c5f59ea5cb. As notas D1 abaixo descrevem
a origem. O usuário determinou exclusivamente dados fictícios nesta homologação.
Não importar dados do Site original. Preservar a interface e os estilos.

- A aplicação publicada usa Next.js/React, servidor Node.js e PostgreSQL no Railway.
- O PostgreSQL é a fonte oficial dos dados protegidos; `localStorage` é somente cache operacional e preferências do dispositivo.
- Os arquivos de D1 em `db/` e `drizzle/` e os registros sinalizados na documentação descrevem etapas anteriores.
- Sessões, senhas, bloqueio de login, usuários, RBAC e auditoria são validados no servidor.
- Toda nova operação sensível deve exigir sessão e autorização no endpoint, mesmo que a interface esconda o botão.
- Não introduza dados fictícios para contornar infraestrutura ou em seeds públicas.
- Não altere diretamente a identidade visual definida em `src/styles/theme.css`.
- Migrations publicadas são imutáveis; crie uma nova migration para mudanças posteriores.

## Registro de alterações relevantes

- 2026-09-23: projeto consolidado em `OneDrive\Documentos\PilaManager\Site - Pilamanger`, documentação em `docs/` e arquivos gerados/segredos ignorados.
- 2026-09-23: autenticação e autorização migradas para o servidor, com PBKDF2 encadeado (400 mil iterações efetivas), cookie HttpOnly, sessões no D1, RBAC, bloqueio de login, auditoria e troca obrigatória de senha temporária.
- 2026-09-23: dados operacionais passaram a ser persistidos pela API autenticada no D1; o cache do navegador é limpo no logout.
- 2026-06-27: auditoria confirmou que a cópia ativa é esta pasta (`Documents\´PilaManager 2.1`), servida pelo Vite em `127.0.0.1:4173`. Não aplicar correções na cópia antiga `Documents\Site Pillamanger`.
- 2026-06-27: recibos individuais financeiros passaram a usar pagamentos recebidos reais, com validação de campos e geração por blob PDF.
- 2026-06-27: telefone de perfil passou a usar máscara brasileira e persistência no usuário autenticado; idioma passou a persistir globalmente e por usuário.
- 2026-06-27: cadastro de paciente com plano passou a gravar paciente, vínculo, saldo/validade e cobrança com rollback local.
- 2026-06-27: agenda passou a usar data real e a disponibilidade persistida do profissional (turnos, duração, intervalos, bloqueios e afastamentos), permitindo vários alunos no mesmo horário com contador.
