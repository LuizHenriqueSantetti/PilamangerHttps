# Padrão visual — 20/10/2026

Referência: imagem fornecida pelo usuário, com fundo azul muito claro, painéis brancos, títulos azul-marinho, ícones em superfícies pastel e seleção turquesa.

- Uma única barra lateral principal. Categorias de Relatórios e seções de Configurações passaram para navegação horizontal; no celular, o seletor de módulos existente permanece.
- Cabeçalho com busca e ações; localização da tela acima do conteúdo.
- Tokens compartilhados em `src/styles/redesign.css`, sem alterar `theme.css`. Paleta de superfícies, bordas e textos alinhada nos componentes existentes.
- Indicadores de Dashboard, Financeiro, Cobranças e Comissionamento usam ícone lateral em fundo pastel, rótulo discreto e valor destacado.
- Tabelas, catálogo de planos, filtros e formulários compartilham bordas suaves e espaçamento. Cores semânticas de pendência, receita e despesa preservadas.
- Modo escuro mantém superfícies azul-marinho graduadas e campos contrastantes.
- Troca de tema sincronizada em 22/10/2026: uma captura da página inteira e uma única animação de 420 ms para lateral, cabeçalho, conteúdo e painéis. Transições internas ficam desativadas durante a captura para não atrasar regiões separadas. Navegadores sem View Transitions mantêm a alternativa de cores. Aparência permite seguir o sistema, escolher transição suave ou desligá-la; “Sem animações” da acessibilidade continua prioritário. Cliques rápidos cancelam capturas antigas sem aplicar o destino errado.
- Menu do perfil limita nome e e-mail ao espaço disponível, com reticências e texto completo no título ao passar o mouse; largura limitada ao viewport.
- Menu do perfil com avatar, identificação, selo de cargo, grupos de opções, setas e saída destacada. Mensagens permanentes de sincronização removidas do cabeçalho; estados de salvamento e erro continuam disponíveis.
- Painéis de abertura usam o padrão compartilhado em `src/styles/panels.css`: fundo desfocado, superfície arredondada, cabeçalho com ícone, campos em blocos suaves e ações no rodapé. Agenda utiliza ícones por campo. Mantidas as dimensões adequadas a cada conteúdo, com rolagem e adaptação móvel.
- Nenhuma alteração nos contratos de armazenamento, autenticação, permissões ou cálculos. Não foram introduzidos dados ilustrativos da referência.

## Verificações

- Sincronização de tema: 67 testes aprovados e typecheck sem erros. No navegador local, ida e volta com painel aberto: sidebar/content/panel com transitionDuration=0s durante snapshot; animação única pm-theme-unified com duração 0,42 s. Nenhuma alteração de banco, permissões ou cálculos.

- TypeScript sem erros; 32 testes automatizados aprovados.
- Navegação nos nove módulos principais em viewport móvel de 390 px, sem transbordamento horizontal da página.
- Inspeção desktop de Planos, Pacientes, Equipe, Agenda, Financeiro e Relatórios: uma barra lateral, sem transbordamento horizontal.
- Modal Novo Plano em modo escuro cabe no viewport desktop e móvel. Configurações inspecionadas com navegação horizontal.
- Esta verificação é visual e de regressão automatizada; não representa uma nova homologação integral das operações financeiras ou clínicas.
