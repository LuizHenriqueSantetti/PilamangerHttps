# Exceção única de demonstração — 22/10/2026

Solicitada e autorizada pelo proprietário: oito clientes com nomes fornecidos, demais dados fictícios, aniversários e idades variados, pagamentos simulados anteriores a hoje e aulas em datas diferentes. Não representa atendimento, diagnóstico, consentimento dos titulares ou movimentação bancária real.

- Fluxo restrito à sessão de Gerência, mesma origem, confirmação explícita de teste.
- Página operacional `/teste-historico`, sem inclusão no menu normal.
- O servidor aceita somente a confirmação do lote fixo; não aceita nomes, datas ou valores arbitrários no payload.
- Autorização expira em 23/10/2026 às 00h de São Paulo. O recibo permanente em `demo_import_runs` bloqueia repetição, inclusive se os registros de demonstração forem removidos depois.
- Gravação em lote D1 atômica: recibo, cinco coleções e auditoria. O recibo compara todas as fontes lidas antes da gravação e cada escrita exige o identificador exclusivo dessa requisição. Conflitos não deixam importação parcial.
- O lote acrescenta dados e não substitui os pacientes, planos, profissionais, pagamentos ou comissões anteriores. `createdAt`/`importedAt` mantêm o instante real da importação; datas operacionais são explicitamente simuladas.
- Oito pacientes, oito vínculos, oito cobranças (cinco recebidas, três pendentes), oito agendamentos (cinco anteriores, três futuros), cinco comissões pendentes de repasse. Planos antigos expirados ficam encerrados; não são apresentados como matrículas atuais.
- Mesmas regras de cálculo financeiro existentes. Pagamento pendente não vira receita; comissão pendente não vira despesa.
- Uso normal: servidor recusa novos cadastros operacionais, vencimentos e agendamentos passados, mesmo por chamada direta à API. Histórico já persistido continua legível e suas datas não podem ser alteradas para outra data passada. Nascimento e histórico clínico não são datas de agendamento.
- Recebimento normal continua registrando somente a data atual. Não foi criado seletor retroativo, parâmetro de exceção genérico ou segredo embutido.

Verificação: testes de fixture, integridade de vínculos, consolidação mensal, datas civis e regressões. Testes de endpoint cobrem sessão, perfil, origem, carga única, repetição, concorrência e rollback. A execução online deve ser conferida após a publicação e os dados recarregados no navegador, para não reutilizar cache anterior.
