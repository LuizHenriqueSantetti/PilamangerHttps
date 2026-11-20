# Publicação do PilaManager

A aplicação e o PostgreSQL estão no Railway.

[Endereço da demonstração](https://pilamanager-web-production.up.railway.app/)

## Publicação automática

Quando uma alteração de código é enviada para a versão principal (`main`) no GitHub, o GitHub Actions executa os testes, a conferência de tipos, a consulta de alertas nas bibliotecas e a preparação da aplicação.

Se essas etapas passam, o código é publicado no Railway. O processo aguarda a aplicação iniciar e confere se o endereço HTTPS responde e se os dados continuam exigindo login.

As instruções desse processo estão em [.github/workflows/railway.yml](../.github/workflows/railway.yml).

Alterações apenas na documentação não geram uma nova publicação da aplicação.

## Configurações

O endereço do banco e as senhas são configurados fora dos arquivos públicos do código. O GitHub guarda a credencial da publicação como um segredo restrito ao projeto e ao ambiente usado.

Na inicialização, a aplicação confere as atualizações necessárias no banco. A criação de contas fictícias depende da configuração `DEMO_MODE`.

## Endereço e hospedagem

Foi mantido o endereço do Railway com HTTPS, sem compra de domínio e sem contratação de plano pago. O teste gratuito está sujeito ao prazo e aos créditos disponíveis; ele não é uma garantia de hospedagem permanente.

[Comandos e configurações da publicação](tecnica/EXECUCAO_E_PUBLICACAO.md)
