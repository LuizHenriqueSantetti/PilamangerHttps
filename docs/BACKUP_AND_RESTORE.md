# Cópias de segurança

Foi configurada uma rotina diária às **21h, no horário de São Paulo**, para copiar o banco do PilaManager para o computador.

A rotina depende do computador e do Codex disponíveis, de conexão com a internet e de acesso ao Railway. Ela não é um serviço de backup independente na nuvem.

## O que a rotina faz

O arquivo `scripts/backup-railway.mjs` cria uma cópia do espaço usado pelo PilaManager no PostgreSQL. Depois, confere se o arquivo pode ser lido pelas ferramentas do banco e registra a data, o tamanho e uma identificação de integridade chamada SHA-256.

Os arquivos ficam em `.private/backups/`, fora do GitHub. A rotina não apaga cópias anteriores.

## O que foi testado

A rotina foi executada e uma cópia foi restaurada em um banco local separado. As contas e o paciente fictício foram conferidos após a restauração. O banco temporário foi removido ao terminar o teste.

O registro dessa verificação está no [relatório de validação](VALIDACAO_RAILWAY_NOVA_EXPERIENCIA.md).

## Cuidados

- As cópias do banco podem conter informações de acesso e não devem ser compartilhadas como parte do código.
- Uma restauração deve ser testada em um banco separado antes de substituir dados em uso.
- O funcionamento da rotina depende das condições descritas acima; um agendamento criado não prova que todas as execuções futuras acontecerão.

[Guia com os comandos de apoio](tecnica/EXECUCAO_E_PUBLICACAO.md)
