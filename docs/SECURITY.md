# Segurança

## Controles implementados

- HTTPS fornecido pela hospedagem em produção.
- Cookie de sessão `HttpOnly`, `Secure` em produção e `SameSite=Lax`.
- Token aleatório de 256 bits; somente seu hash é armazenado no banco.
- Senhas derivadas com quatro etapas encadeadas de PBKDF2-SHA256, salt aleatório e 400.000 iterações efetivas, respeitando o limite de 100.000 por chamada do runtime.
- Sessões normais de 12 horas e opção “lembrar” de 30 dias.
- Bloqueio de 15 minutos após cinco tentativas inválidas.
- Validação de origem nas mutações para reduzir CSRF.
- Validação de entrada e consultas parametrizadas para impedir injeção SQL.
- RBAC e listas de acesso a dados aplicadas no servidor.
- CSP, bloqueio de frames, `nosniff`, política de referenciador e permissões restritas.
- Erros públicos genéricos e logs sem senhas ou tokens.
- Auditoria de login, logout, alterações de senha, usuários e gravações.
- Troca obrigatória da senha temporária no primeiro acesso.
- Inicialização da primeira conta protegida por segredo temporário da hospedagem; o segredo é removido após o uso.

## Regras operacionais

- Não utilizar dados reais em seeds, testes ou screenshots públicos.
- Inativar imediatamente contas desligadas da clínica.
- Conceder o menor perfil necessário.
- Não enviar senha temporária e endereço do sistema no mesmo canal.
- Revisar periodicamente usuários, auditoria e sessões.
- Para LGPD, definir formalmente controlador, operadores, retenção, atendimento ao titular e resposta a incidentes.

## Limitação conhecida

Não há provedor de e-mail configurado. A recuperação de acesso deve ser feita pela Gerência, que redefine a senha temporária na administração; o usuário será forçado a alterá-la no próximo login.
