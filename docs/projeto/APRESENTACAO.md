# Apresentação do PilaManager

## Proposta

O PilaManager é um sistema web para organizar a rotina de um estúdio de Pilates. Ele reúne informações que precisam ser consultadas juntas: pacientes, profissionais, horários, planos, cobranças e comissões.

O projeto foi desenvolvido durante o semestre. A evolução partiu das primeiras telas e chegou a uma versão de demonstração publicada na internet, com banco de dados e contas com diferentes permissões.

## Quem usa

- A gerência acompanha os cadastros, os usuários, os recebimentos e os resultados do estúdio.
- A recepção trabalha com os pacientes, os horários e as cobranças, dentro das permissões de sua conta.
- Os profissionais têm acesso às informações permitidas para seu perfil.

O acesso é conferido no servidor. Esconder um botão na tela não é a única proteção usada pelo sistema.

## Um exemplo de uso

1. A gerência cadastra um plano, com valor e quantidade de aulas.
2. A equipe cadastra um paciente e vincula esse plano.
3. O sistema registra o vínculo e a cobrança correspondente.
4. Um atendimento é marcado conforme os horários do profissional.
5. Quando a cobrança é recebida, o valor aparece no Financeiro.
6. A comissão é calculada pelas regras do profissional e pelas confirmações exigidas pelo sistema.
7. Os relatórios permitem consultar os resultados e gerar os PDFs.

Nos testes, esses passos foram feitos com pessoas e valores fictícios.

## O que foi entregue até agora

A versão atual tem cadastros, agenda, planos, cobranças, comissões, financeiro, relatórios e controle de usuários. Ela pode ser acessada pela internet e adapta suas telas para computador e celular.

O código está no GitHub. As alterações passam por verificações antes da publicação automática no Railway. Também foram feitos testes de gravação no banco e de restauração de uma cópia de segurança.

## Continuidade do projeto

Ainda há espaço para separar os dados de cada módulo em tabelas próprias, ampliar os testes com mais situações de uso e preparar a operação definitiva do sistema. A versão disponível é de demonstração; os testes realizados não são uma garantia de funcionamento para todo cenário possível.

## Links

- [Sistema publicado](https://pilamanager-web-production.up.railway.app/)
- [Quadro do Trello](https://trello.com/b/tFTm4z72/pilamanager-21)
- [GitHub do projeto](https://github.com/LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres)
- [Ferramentas utilizadas](FERRAMENTAS.md)
- [Banco de dados](BANCO_DE_DADOS.md)
