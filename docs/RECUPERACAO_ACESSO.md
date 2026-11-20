# Recuperação excepcional da conta principal

O endpoint POST /api/auth/recovery fica desativado por padrão. Somente o titular da hospedagem pode provisionar o segredo OWNER_RECOVERY_GRANT no ambiente de produção.

O segredo contém JSON com userId, expectedUpdatedAt, tokenHash (SHA-256 hexadecimal de token aleatório de 256 bits) e expiresAt. Deve expirar em até 30 minutos. O token original e a senha chegam apenas no corpo da solicitação HTTPS, nunca em URL, código, logs ou Git. A origem deve corresponder ao site.

A operação é limitada à conta ativa de Gerência indicada no segredo. Atualiza a senha usando o mesmo hash forte do login, invalida todas as sessões, limpa bloqueios de tentativas e registra auditoria, em transação. Uma comparação atômica do updated_at impede reutilização da autorização. Preserva dados operacionais, perfil e aceite de privacidade.

Após confirmar o acesso, remover OWNER_RECOVERY_GRANT do ambiente e publicar a mesma versão para aplicar a remoção. Nunca configurar permanentemente uma autorização de recuperação. Não há recuperação pública por e-mail enquanto um serviço de e-mail não estiver configurado.
