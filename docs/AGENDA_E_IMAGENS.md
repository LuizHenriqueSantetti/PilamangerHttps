# Agenda e imagens - 22/10/2026

## Agenda

- Separação de 20 px entre dias, 12 px entre registros do mesmo dia e superfícies suaves no tema claro.
- Faixas de situação com 6 px na lista e no calendário; rótulos e ícones preservados.
- Semana de domingo a sábado, com período correspondente à primeira e à última coluna. Setas de 42 px, nomes acessíveis e botão Hoje.
- Calendário com legenda, instrução, linhas alternadas, destaque no dia atual, dados do profissional e indicação de várias aulas no mesmo horário. Nenhuma regra de agendamento ou registro foi alterada.

## Fotos

Problemas encontrados: imagens originais sem redução ultrapassavam o limite do avatar e eram silenciosamente substituídas por null; alterações de outros campos sem foto também apagavam o avatar. O cabeçalho consultava a antiga chave local `users`, não a sessão autenticada.

- Seleção aceita JPG, PNG e WebP de até 10 MB; o navegador redimensiona para até 640 px e envia raster limitado a 512 KB.
- Arquivos persistidos no binding R2 `BUCKET`, com referências no usuário D1 ou no cadastro da clínica. Não há bucket público.
- `POST /api/images`: sessão, mesma origem, tamanho real do stream, assinatura raster e perfil Gerência/Administrador para logo da clínica.
- `GET /api/images`: sessão obrigatória; foto pessoal restrita ao próprio usuário ou à administração; cache privado sem armazenamento.
- Perfil preserva foto quando o campo é omitido; valores inválidos retornam erro, sem falso sucesso. Referências precisam corresponder a arquivo próprio existente.
- Atualização do cabeçalho usa o usuário autenticado e evento de perfil atualizado. Avatares e prévias foram ampliados; logo usa contain para não cortar a marca.
- Selecionar imagem prepara a prévia; Salvar Perfil/Clínica confirma a persistência. Falhas mantêm a prévia para nova tentativa.
- Logos usados no relatório complementar em PDF continuam carregando pela URL autenticada.

## Verificação

Testes cobrem datas, ida/volta entre semanas, virada de ano, validação de arquivos, preservação de avatar omitido, gravação/leitura de bytes, sessão, origem e autorização. Testes de navegador usam somente o ambiente local para upload; não substituem fotos reais do proprietário no ambiente hospedado.

Conferência local: 93 testes automatizados aprovados; TypeScript sem erros; build de produção concluído (aviso de chunks grandes já existente). Navegador: lista clara com espaçamento e faixas novas, calendário e avanço de semana, retorno por Hoje, upload de foto e logo pelos formulários. Após recarregar, ambas as imagens carregaram com naturalWidth maior que zero a partir das URLs autenticadas do armazenamento. O projeto não oferece script de lint.
