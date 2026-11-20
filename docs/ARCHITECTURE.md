# Arquitetura

## Fluxo principal

```text
Navegador -> HTTPS -> Vinext/Worker -> autenticação e RBAC -> Cloudflare D1
```

O front-end preserva os módulos e o visual existentes. A camada `src/app/services` conversa com rotas em `app/api`. As rotas validam sessão, perfil, origem e conteúdo antes de acessar o D1.

## Dados

As tabelas relacionais de segurança são `users`, `sessions`, `login_attempts` e `audit_logs`. Os dados operacionais legados são persistidos em `app_storage` para manter compatibilidade com os contratos existentes da interface durante a migração. Cada chave possui lista de acesso definida no servidor e os valores são JSON validado com limite de tamanho.

Esse formato evita uma reescrita arriscada de todas as telas de uma vez. A evolução recomendada é migrar, módulo por módulo, pacientes, profissionais, agenda, pagamentos e financeiro para tabelas relacionais dedicadas, mantendo os mesmos endpoints e testes de regressão.

## Fonte oficial

O D1 é a fonte oficial. O cache no navegador existe para experiência rápida e é limpo no logout; credenciais, hashes de senha e tokens não são gravados nele.

## Proteção de módulos

As APIs recusam requisições sem sessão. Operações de usuários exigem Gerência ou Administrador, e somente Gerência pode criar ou administrar outra conta de Gerência. A autorização não depende de botões escondidos no navegador.
