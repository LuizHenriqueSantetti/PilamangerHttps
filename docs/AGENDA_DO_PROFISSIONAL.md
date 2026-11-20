# Consulta de aulas pela Equipe - 22/10/2026

Em Equipe, o botão **Ver agenda** no cartão de cada profissional abre uma consulta por Semana ou Mês. As setas mudam o período e Hoje retorna à data atual. O nome do profissional fica no cabeçalho; o calendário indica dias com aulas e permite filtrar um dia ou retornar a Todos os dias.

A lista mostra paciente, início/término, sala, aula experimental e situação. Cancelados ficam ocultos inicialmente e podem ser incluídos. Indicadores distinguem aulas não canceladas, próximas dentro do período e canceladas. A consulta não altera datas, situações nem cadastros. Não se interpreta aula confirmada como presença realizada.

## Fonte e autorização

- `GET /api/professional-schedule` exige sessão e os perfis Gerência, Administrador ou Recepção, que possuem acesso padrão à Equipe. O botão exige também a permissão de visualizar Agendamento na interface. Permissões granulares seguem os limites existentes do projeto.
- A leitura consulta diretamente `profissionais` e `agendamentos` no D1, filtra pelo profissional e intervalo de até 42 dias e retorna somente campos necessários à consulta. Não depende de uma cópia independente no navegador e não concede acesso a banco, comissões ou dados clínicos adicionais.
- A associação usa professorId. Para registros antigos sem ID, utiliza nome exato normalizado apenas se não houver homônimos. Registros sem data são avisados, nunca projetados como recorrência fictícia.
- Consultas são no-store. Troca rápida de período cancela a requisição anterior para impedir mistura de resultados. Erro permite tentar novamente; sessão expirada segue o tratamento global.
- Semana usa domingo a sábado. Navegação mensal utiliza o primeiro dia do mês para não pular meses a partir de dias 29, 30 ou 31.
- O painel segue superfícies claras/escuras, layout responsivo, teclado com foco contido e fechamento por Escape, devolvendo o foco ao botão de origem.

## Conferência

Testes cobrem autenticação/autorização, minimização de dados, filtragem por ID e período, legado sem ID e homônimos, cancelados, datas ausentes, mês bissexto, virada de ano e navegação sem pular fevereiro. Não há alterações de dados para abrir ou navegar no painel.

Validação local: 105 testes automatizados aprovados e TypeScript sem erros. Navegador conferiu o botão na Equipe, semana/mês, inclusão de cancelados, filtro de dia vazio, avanço de mês e painel no tema escuro. O projeto não oferece script de lint; a publicação também passa pelo build de produção.
