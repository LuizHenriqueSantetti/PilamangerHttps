> Registro de uma etapa anterior. Para a versão atual com PostgreSQL no Railway, consulte o [índice da documentação](README.md).

# Planos e integração financeira — 17/10/2026

## Alterações

- Planos agora usa catálogo em linhas, com preço, duração, aulas, vínculos e ações. Preserva criação, edição, duplicação, ativação e consulta aos alunos.
- Cor única do sistema. Seletor de cores e limite de alunos removidos da interface; campos legados mantidos compatíveis, sem impor capacidade.
- Formulário de plano limitado ao viewport, com rolagem interna. Modais escuros usam superfícies azul-marinho graduadas e campos com bordas contrastantes.
- Máscara monetária nos planos e valores fixos de comissão; RG aceita dígito X e preserva CIN de 11 dígitos. Máscaras de CPF, telefone e CEP existentes preservadas.
- Cobranças passa a listar cobranças reais de pacientes; Comissionamento tem aba própria. Operações financeiras exigem Gerência ou Administrador no servidor.
- Endpoint POST /api/billing: receber cobrança, registrar aula realizada e registrar repasse. Não executa transferências bancárias.
- Comissões exigem uma aula confirmada com data não futura, confirmação explícita de realização e cobrança recebida do mesmo paciente. Cálculo: valor recebido / quantidade de aulas, aplicado à regra percentual, fixa ou híbrida do profissional. Valor e regra ficam registrados; alterações posteriores não recalculam o histórico.
- Duplicidade de aula, recebimento e repasse rejeitada. Atualização financeira compara as fontes lidas no banco antes de gravar, retornando conflito em alteração concorrente. A API genérica não altera nem apaga comissões e não substitui recebimentos já registrados.
- Financeiro e Relatórios consolidam transações, recebimentos e comissões pagas. Referências pagamentoId/comissaoId evitam duplicação de lançamentos vinculados. Cobrança pendente não é receita; comissão pendente não é despesa realizada.
- Dashboard usa o mesmo extrato para receita e aceita date/data dos agendamentos. Datas civis financeiras não recuam um dia por fuso.
- Salvamento de planos só é confirmado depois da resposta do banco. Falhas mantêm aviso e tentativa de reenvio.

## Verificação

- TypeScript sem erros.
- 32 testes em 11 arquivos: máscaras, regras de comissão, consolidação financeira, persistência e regressões existentes.
- 17 verificações HTTP em D1 local: autenticação, recebimento, comissão de R$ 9 sobre aula de R$ 30 (plano de R$ 240 / 8 aulas, regra de 30%), confirmação de realização, duplicidade, repasse, proteção do histórico e persistência após novo login.
- Navegador local: cadastro de plano com preço digitado 35990 exibido como R$ 359,90; salvamento confirmado; formulário claro/escuro em desktop 1280 × 720 e celular 390 × 844; Comissionamento apresenta R$ 9 pago; Financeiro apresenta R$ 240 de receita, R$ 9 de despesa e saldo de R$ 231.
- Dados de teste são fictícios e exclusivos do D1 local; não são enviados ao banco hospedado.
- Build de produção: verificar resultado do fluxo de publicação desta alteração. Não existe comando lint configurado.

## Limites e próximos cuidados

O sistema ainda usa coleções JSON em app_storage, não tabelas relacionais de cada domínio. Esta alteração não equivale a uma homologação de todos os módulos nem resolve conflitos gerais de edição entre dispositivos. Controles granulares editáveis na interface ainda não são a fonte da autorização do backend, que usa perfis. Não usar dados clínicos reais antes da auditoria de acesso e validação de domínio pendentes.

Não há estorno/retificação financeira implementado. Não apague históricos para corrigir um recebimento; é necessária uma operação auditada específica. Comissões de aulas anteriores ao recebimento e contratos especiais devem ser conferidas pela gestão. A regra híbrida existente é percentual mais valor fixo por aula.

Para registros antigos sem quantidade de aulas na cobrança, a primeira confirmação de recebimento utiliza o plano atual. Duplicações legadas sem IDs de origem não são removidas por aproximação de nome/valor, para evitar perda de dados.
