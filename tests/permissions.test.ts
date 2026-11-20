import { describe, expect, it } from 'vitest';
import { DEFAULT_SYSTEM_PERMISSIONS, getCargos } from '../src/app/utils/permissions';

describe('migração compatível de permissões', () => {
  it('adiciona Registro de Atividades sem remover permissões existentes', () => {
    const legacy = { id:'custom', nome:'Personalizado', descricao:'', ativo:true, sistema:false, roleType:'admin', permissoes:{ ...DEFAULT_SYSTEM_PERMISSIONS.admin, registroAtividades: undefined, pacientes:{ ...DEFAULT_SYSTEM_PERMISSIONS.admin.pacientes, excluir:true } } };
    localStorage.setItem('cargos', JSON.stringify([legacy]));
    const migrated = getCargos()[0];
    expect(migrated.permissoes.registroAtividades).toBeDefined();
    expect(migrated.permissoes.pacientes.excluir).toBe(true);
  });
});
