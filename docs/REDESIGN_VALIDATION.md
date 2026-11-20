> Registro de uma etapa anterior. Para a versão atual com PostgreSQL no Railway, consulte o [índice da documentação](README.md).

# Nova experiência — validação de 16/10/2026

## Publicação confirmada em 17/10/2026

- URL: https://pilamanager-nova-experiencia.luizsantetti.chatgpt.site
- Acesso privado do proprietário, preservando o site anterior.
- Versão: `appgprj_6ad254054e508191a47c1a40919f1831~appgver_f9609c4910d48191826c1b525aed7e51`.
- Deploy concluído: `appgdep_6ad3a60bcaa4819193b8e7cddda4726f`.
- Commit publicado: `96ae10b7b8ff834ab4a6c5bf56a904d5e79ddb2b`.
- Empacotamento local bloqueado por ausência de Bash no Windows. Usado o fallback nativo de build remoto do Sites, com sucesso.
- Página HTTPS aberta no navegador, sem erro de console observado na entrada.
- Conta inicial do proprietário criada no banco novo. Credencial temporária salva fora do OneDrive em `%LOCALAPPDATA%/PilaManager/private/nova-experiencia-primeiro-acesso.txt`.
- Verificação HTTP online: API sem sessão retorna 401; login inicial válido; cookie Secure/HttpOnly/SameSite=Lax; API exige troca de senha com 428; sessão de teste encerrada.
- O proprietário deve efetuar a troca de senha no primeiro acesso. Não houve troca automatizada de sua senha nem aceite da política em seu nome.
- Testes completos dos módulos online seguem pendentes. A publicação não altera os limites de homologação descritos abaixo.
- A cópia temporária de preparação `.redesign-template` ainda existe: a remoção foi bloqueada pela política da ferramenta. Não é a versão principal. O script descartável de troca de paleta foi removido da versão nova.

## Escopo e preservação

- Original: `Site - Pilamanger`, sem alterações no Git durante este trabalho.
- Nova versão: `Site - Pilamanger Novo`, Site e banco independentes.
- Mesma stack Vinext/React/Workers/D1 e mesmos módulos existentes. Não houve migração para PostgreSQL.
- Não foram copiadas contas, pacientes, credenciais, Git ou dados de execução do original.
- Trello consultado somente como referência, sem alterar cartões. Requisitos descritos lá não são prova de implementação.

## Alterações

- Novo sistema visual em `src/styles/redesign.css`, mantendo `theme.css` original intacto.
- Entrada em duas áreas, navegação agrupada por rotina/gestão, cabeçalho contextual, novos indicadores e cartões, tabelas e formulários consistentes.
- Claro em branco/azul/verde; escuro azul-marinho, com cores semânticas de aviso, sucesso e erro.
- Indicador de salvamento real, fila serializada com tentativa após falha, aviso ao fechar com gravações pendentes e carregamento sem reenvio de cache antigo.
- Corrigidos falsos indicadores percentuais do financeiro e datas civis deslocadas pelo fuso em cadastro e relatórios.
- Lista de agenda agrupada por data real, não misturando segundas-feiras de semanas diferentes.
- Perfis restritos não inicializam cargos nem enviam o agregado administrativo de auditoria junto a alterações permitidas. Cada gravação aceita continua auditada pelo servidor.

## Evidências locais

- TypeScript: sem erros na execução após alterações.
- Vitest: 28 testes, 10 arquivos, incluindo máscaras, permissões, agenda, matrícula/plano, PDFs, conteúdo/idiomas, sincronização, datas e auditoria de perfis restritos.
- Build de produção: concluído pelo fluxo Sites; aviso não bloqueante de pacote JavaScript acima de 500 kB.
- Integração HTTP: 60 verificações com D1 local real. Inclui login válido/inválido, origem, senha temporária, sessão, logout/revogação, persistência entre logins, criação/leitura/atualização/remoção de coleções, contas inativas, bloqueio por tentativas e rejeição de acesso financeiro/usuários por perfis restritos.
- API de coleções: teste de transporte/persistência, não substitui validação de negócio de cada formulário.
- Navegador: entrada; temas claro/escuro; navegação; paciente inválido, criação, edição e persistência após refresh; criação de plano; vínculo ao paciente gerando cobrança; criação de profissional com disponibilidade/comissão; criar, alterar horário e cancelar agendamento; abrir cobranças, financeiro e relatórios.
- Responsividade verificada em 1280px e 390px. Evidências locais em `test-results/`, ignoradas no Git.
- Fixtures são fictícias e exclusivas do banco local. Não são publicadas como dados de produção.
- Não existe configuração ESLint herdada; não foi declarado resultado de lint inexistente.

## Limites: não declarar homologação integral

- O backend herdado usa coleções JSON em `app_storage`; faltam validação completa de domínio no servidor, integridade relacional por entidade e resolução de conflito entre dispositivos. SQL parametrizado e sessão não equivalem a esses controles.
- RBAC de APIs é por perfil/chave. As permissões granulares editáveis na interface e o recorte por profissional ainda precisam ser alinhados integralmente no servidor antes de receber dados clínicos reais.
- Nem todos os botões/exportações, estados de erro, combinações de permissões, expiração temporal e cenários de pagamento/comissão foram homologados ponta a ponta.
- A tela de pagamentos do paciente herdada exibe cobranças; não afirmar que existe um fluxo completo de recebimento manual apenas porque uma cobrança foi criada.
- Não foi migrado o banco original. É necessária decisão explícita e procedimento seguro caso o proprietário queira transferir dados reais.
- Backups seguem a documentação de D1 herdada; restauração real do novo banco não foi ensaiada.
- `.gitignore` impede versionamento, não sincronização do OneDrive. Dependências/cache e arquivos locais sensíveis precisam de política separada do OneDrive; não foi alterada a configuração pessoal de sincronização.

## Reprodução

`pnpm typecheck`, `pnpm test`, `pnpm build`.

Para integração local, `scripts/prepare-local-qa.mjs` gera credenciais ignoradas, as migrations devem estar aplicadas ao D1 local e o servidor deve usar `127.0.0.1:4192`. Só então execute `node scripts/verify-local-api.mjs`. Esse script recusa qualquer outra origem. Não executá-lo contra o banco de produção nem durante trabalho com dados reais.
