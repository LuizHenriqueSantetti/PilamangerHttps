# Deploy

O projeto está vinculado ao OpenAI Sites por `.openai/hosting.json`. A plataforma empacota o build Vinext, aplica migrations e executa a aplicação em Cloudflare Workers com HTTPS.

## Antes de publicar

```bash
pnpm typecheck
pnpm test
pnpm build
```

Depois da publicação, valide pelo endereço real: página de login, bloqueio de APIs sem sessão, login inválido, login válido, troca obrigatória de senha, logout, persistência, perfis e operações críticas.

## Domínio próprio

1. Confirme que `pilamanager.com.br` pertence à clínica.
2. Adicione o domínio no projeto Sites.
3. Copie exatamente os registros DNS informados pela plataforma para o provedor do domínio.
4. Aguarde a validação e emissão do certificado.
5. Configure o domínio principal e o redirecionamento de `www` conforme a plataforma permitir.
6. Repita os testes de autenticação e cookies em ambos os endereços HTTPS.

Não marque o domínio como ativo antes da validação DNS e do certificado concluírem.
