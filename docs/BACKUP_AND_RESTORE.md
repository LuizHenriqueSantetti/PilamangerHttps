# Backup e restauração

O banco contém dados pessoais e financeiros. Todo backup deve ser tratado como dado sensível.

## Política recomendada

- Exportação diária, com retenção de 30 dias.
- Uma cópia semanal criptografada em local separado da conta de hospedagem.
- Acesso restrito à Gerência e ao responsável técnico.
- Teste de restauração trimestral em ambiente isolado.
- Registro de quem gerou, acessou ou restaurou cada cópia.

## Exportar

Use a ferramenta de exportação D1 da conta que hospeda o projeto e grave o arquivo fora desta pasta e fora do repositório:

```bash
wrangler d1 export <DATABASE_NAME_OR_ID> --remote --output pilamanager-YYYY-MM-DD.sql
```

Confirme que o arquivo não está vazio, calcule um checksum SHA-256, criptografe-o e envie-o ao cofre definido pela clínica. O nome ou ID real deve ser obtido no painel da hospedagem; não o inclua no código.

## Restaurar

1. Interrompa gravações e gere um backup final do banco atual.
2. Crie um banco D1 isolado para ensaiar a restauração.
3. Importe o SQL com a ferramenta D1 da conta.
4. Aplique migrations posteriores, se existirem.
5. Valide contagens, relacionamentos, login e operações críticas.
6. Só então altere o binding `DB` da produção em uma janela de manutenção.
7. Monitore erros e preserve a cópia anterior para rollback.

Nunca restaure diretamente sobre produção sem ensaio e sem cópia verificável do estado anterior.
