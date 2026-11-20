# Revisão dos pedidos — 22/10/2026

## Problemas reproduzidos e corrigidos

1. O navegador de teste estava solicitando movimento reduzido, sem a classe de acessibilidade da aplicação. A versão anterior desativava o efeito silenciosamente. Essa é uma causa confirmada no ambiente observado, não uma confirmação das preferências de todos os navegadores do usuário.
2. Configurações → Aparência utilizava o mesmo comando de alternância nos dois temas: clicar no tema ativo selecionava o outro. Agora o tema já selecionado não muda.
3. O efeito anterior dependia de snapshots da API View Transitions. Foi substituído por transições de cores das próprias superfícies, campos, textos e bordas.
4. O estilo compartilhado dos campos tornava o seletor de seções móvel visível também no desktop, duplicando a navegação de Configurações. A visibilidade foi corrigida no breakpoint de 640 px.

## Como funciona agora

Em Meu Perfil → Aparência → Transição entre temas:

- Seguir o sistema: respeita a preferência de movimento do navegador.
- Transição suave: opção explícita de cores por 420 ms, inclusive quando o sistema reduz movimento. Não muda as preferências do Windows/navegador.
- Sem animação: troca imediata.

“Sem animações” no menu de acessibilidade continua prioritário. A preferência é local ao dispositivo, não altera dados clínicos e não requer migration.

## Conferência dos demais pedidos

| Pedido | Evidência e situação |
| --- | --- |
| Uma barra lateral e paleta clara branca/azulada/esverdeada | Sidebar única e tokens compartilhados presentes na revisão de origem. |
| Modo escuro azul-marinho | Tokens e superfícies dos módulos/modais presentes. |
| Planos com layout novo, sem seletor de cor nem limite de alunos | Catálogo em linhas e formulário atuais; propriedades antigas mantidas somente por compatibilidade de dados. |
| Painéis semelhantes à referência | Modais de cadastro/edição/consulta/confirmação compartilham pm-panel e panels.css. Menus compactos e popovers mantêm comportamento próprio. Não significa que todo conteúdo seja idêntico à imagem. |
| Nome/e-mail sem ultrapassar o menu | Identificação com min-width:0, truncamento e largura limitada ao viewport. Menu em grupos, ícones e saída destacada. |
| Retirar “Salvo no servidor” permanente | SyncStatus retorna vazio em idle/saved; mantém somente andamento/erro. |
| Comissionamento integrado | Aba e endpoint financeiro existentes; cálculos e restrições documentados em PLANOS_COMISSIONAMENTO.md. |
| Máscaras | CPF, RG/CIN, telefone, CEP e moeda implementados; testes anteriores mantidos. |
| Notificações globais | Componente central nos cadastros, configurações, financeiro e exportações; detalhes e limites em NOTIFICACOES.md. |
| Todas as funcionalidades de produção concluídas | Não. A conclusão integral nunca foi homologada; ver pendências abaixo. |

## Pendências anteriores que não foram corrigidas por mudanças visuais

- O endereço continua owner-private na hospedagem: não é acesso irrestrito para qualquer pessoa com o link.
- O banco é Cloudflare D1, com coleções JSON operacionais. Não houve migração para PostgreSQL/tabelas de domínio.
- Permissões granulares configuráveis na interface ainda não substituem a autorização por perfis do backend.
- “Fechar período” da tela analítica antiga bloqueia somente a edição na sessão. Pagamentos persistentes usam Comissionamento; não existe fechamento contábil real nessa ação.
- Não há estorno financeiro auditado implementado.
- Domínio próprio, backup/restauração operacional e homologação integral de todos os fluxos/dispositivos não foram comprovados nesta revisão.
- Essas pendências não devem ser anunciadas como prontas nem corrigidas por exclusão de históricos.

## Testes desta correção

- 63 testes automatizados passaram, incluindo oito novos testes de tema: ida/volta, cliques rápidos, limpeza, movimento reduzido automático, opção suave, prioridade de acessibilidade, opção desligada e preferência inválida.
- Typecheck sem erros.
- Navegador local: movimento reduzido automático reproduzido; opção suave acionou data-pm-theme-motion=colors e duração computada de 0,42 s nos dois sentidos; tema ativo permaneceu selecionado ao clicar novamente.
- As verificações locais usam conta e registros fictícios. Nenhum paciente real foi usado para CRUD.
- Os testes não equivalem a uma nova homologação de todos os módulos ou acesso interno online. A publicação e eventual restrição de login devem ser informadas separadamente.
