# Acesso e cuidados com os dados

## Contas e permissões

O PilaManager usa contas individuais com os perfis de gerência, administração, recepção e fisioterapeuta. O servidor confere o perfil antes de permitir uma operação.

As senhas são guardadas de forma protegida, sem o texto original. A sessão de acesso fica no banco, e o navegador recebe uma identificação de sessão. Na publicação HTTPS, essa identificação usa as proteções Secure, HttpOnly e SameSite=Lax.

Também há bloqueio após tentativas inválidas de entrada, conferência da origem dos pedidos e registro de ações realizadas no sistema. Senhas temporárias criadas pela administração precisam ser trocadas no primeiro acesso.

## Dados de demonstração

A versão de demonstração e seus testes usam dados fictícios. Senhas, chaves de acesso, arquivos locais de configuração e cópias do banco não são enviados ao GitHub.

## Recuperação de acesso

Não há envio automático de e-mail para recuperar senha. A gerência deve fazer a redefinição pela área de usuários. O usuário troca a senha temporária ao entrar novamente.

## Limites

Ter login e permissões não significa que toda situação de segurança já foi avaliada. O projeto não passou por uma certificação de segurança ou de uso clínico. O uso com dados reais exige uma preparação própria para essa operação.

[Consultar os testes e os limites registrados](VALIDACAO_RAILWAY_NOVA_EXPERIENCIA.md)
