# Publicação e backup

## Publicação

A aplicação e o banco estão no Railway. O endereço de demonstração é:

https://pilamanager-web-production.up.railway.app/

Alterações de código enviadas para `main` passam por testes, conferência de tipos, auditoria de bibliotecas e build no GitHub Actions. Depois, são publicadas automaticamente. O processo aguarda o sistema iniciar e confere o acesso HTTPS.

A configuração está em [.github/workflows/railway.yml](../.github/workflows/railway.yml). Senhas e credenciais são guardadas fora do código.

Não foi contratado plano pago. A hospedagem de teste depende do prazo e dos créditos disponíveis.

## Backup

Há uma rotina diária às 21h, no horário de São Paulo, pelo Codex. Ela depende do computador e do Codex disponíveis, da internet e do acesso ao Railway.

O script `scripts/backup-railway.mjs` cria uma cópia do PostgreSQL, confere o arquivo e registra sua integridade. As cópias ficam em `.private/backups/`, fora do GitHub. Não há exclusão automática das cópias anteriores.

A criação e a restauração de uma cópia foram testadas em banco local separado. Essa rotina não equivale a um backup gerenciado que funcione com o computador desligado.
