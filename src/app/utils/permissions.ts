// Sistema de permissões granulares do PilaManager 2.0

export type RoleType = 'gerencia' | 'admin' | 'fisio' | 'recepcao';

// Permissão granular por módulo
export interface ModulePermission {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  exportar: boolean;
  restrito: boolean; // dados financeiros, sigilosos
  manage_class_payment_status?: boolean;
}

// Permissões completas de um cargo
export interface SystemPermissions {
  dashboard:     ModulePermission;
  agendamento:   ModulePermission;
  pacientes:     ModulePermission;
  equipe:        ModulePermission;
  planos:        ModulePermission;
  cobrancas:     ModulePermission;
  financeiro:    ModulePermission;
  relatorios:    ModulePermission;
  configuracoes: ModulePermission;
  usuarios:      ModulePermission;
  registroAtividades: ModulePermission;
}

// Cargo no sistema
export interface Cargo {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  sistema: boolean; // cargos de sistema não podem ser excluídos
  roleType: RoleType;
  permissoes: SystemPermissions;
}

// --- Helpers de permissão padrão ---
export const FULL: ModulePermission  = { visualizar: true,  criar: true,  editar: true,  excluir: true,  exportar: true,  restrito: true, manage_class_payment_status: true  };
export const FULL_NO_DELETE: ModulePermission = { visualizar: true, criar: true, editar: true, excluir: false, exportar: true, restrito: false };
export const VIEW_EXPORT: ModulePermission    = { visualizar: true,  criar: false, editar: false, excluir: false, exportar: true,  restrito: false };
export const VIEW_ONLY: ModulePermission      = { visualizar: true,  criar: false, editar: false, excluir: false, exportar: false, restrito: false };
export const NO_ACCESS: ModulePermission      = { visualizar: false, criar: false, editar: false, excluir: false, exportar: false, restrito: false };

// --- Permissões padrão por cargo ---
const GERENCIA_PERMS: SystemPermissions = {
  dashboard: FULL, agendamento: FULL, pacientes: FULL, equipe: FULL,
  planos: FULL, cobrancas: FULL, financeiro: FULL, relatorios: FULL,
  configuracoes: FULL, usuarios: FULL, registroAtividades: FULL,
};

const ADMIN_PERMS: SystemPermissions = {
  dashboard: { ...FULL, restrito: false },
  agendamento: FULL,
  pacientes: FULL,
  equipe: FULL_NO_DELETE,
  planos: FULL,
  cobrancas: FULL,
  financeiro: { ...FULL_NO_DELETE, restrito: false },
  relatorios: VIEW_EXPORT,
  configuracoes: { visualizar: true, criar: false, editar: true, excluir: false, exportar: false, restrito: false },
  usuarios: { visualizar: true, criar: true, editar: true, excluir: false, exportar: false, restrito: false },
  registroAtividades: VIEW_ONLY,
};

const FISIO_PERMS: SystemPermissions = {
  dashboard: VIEW_ONLY,
  agendamento: { visualizar: true, criar: true, editar: true, excluir: false, exportar: false, restrito: false },
  pacientes: { visualizar: true, criar: false, editar: true, excluir: false, exportar: false, restrito: false },
  equipe: NO_ACCESS,
  planos: VIEW_ONLY,
  cobrancas: NO_ACCESS,
  financeiro: NO_ACCESS,
  relatorios: NO_ACCESS,
  configuracoes: VIEW_ONLY,
  usuarios: NO_ACCESS,
  registroAtividades: NO_ACCESS,
};

const RECEPCAO_PERMS: SystemPermissions = {
  dashboard: VIEW_ONLY,
  agendamento: { visualizar: true, criar: true, editar: true, excluir: false, exportar: false, restrito: false },
  pacientes: { visualizar: true, criar: true, editar: true, excluir: false, exportar: false, restrito: false },
  equipe: VIEW_ONLY,
  planos: VIEW_ONLY,
  cobrancas: { visualizar: true, criar: false, editar: false, excluir: false, exportar: false, restrito: false },
  financeiro: NO_ACCESS,
  relatorios: NO_ACCESS,
  configuracoes: VIEW_ONLY,
  usuarios: NO_ACCESS,
  registroAtividades: NO_ACCESS,
};

export const DEFAULT_SYSTEM_PERMISSIONS: Record<RoleType, SystemPermissions> = {
  gerencia: GERENCIA_PERMS,
  admin:    ADMIN_PERMS,
  fisio:    FISIO_PERMS,
  recepcao: RECEPCAO_PERMS,
};

// --- Cargos padrão ---
export const DEFAULT_CARGOS: Cargo[] = [
  { id: 'gerencia',  nome: 'Gerência',        descricao: 'Acesso total ao sistema',               ativo: true, sistema: true,  roleType: 'gerencia',  permissoes: GERENCIA_PERMS },
  { id: 'admin',     nome: 'Administrador',   descricao: 'Gerencia operações sem dados restritos', ativo: true, sistema: true,  roleType: 'admin',     permissoes: ADMIN_PERMS    },
  { id: 'fisio',     nome: 'Fisioterapeuta',  descricao: 'Acesso à agenda e pacientes',            ativo: true, sistema: true,  roleType: 'fisio',     permissoes: FISIO_PERMS    },
  { id: 'recepcao',  nome: 'Recepção',        descricao: 'Cadastro e agendamento de pacientes',    ativo: true, sistema: true,  roleType: 'recepcao',  permissoes: RECEPCAO_PERMS },
];

// --- CRUD de cargos ---
export function getCargos(): Cargo[] {
  try {
    const stored = localStorage.getItem('cargos');
    if (stored) {
      const parsed = JSON.parse(stored) as Cargo[];
      let changed = false;
      const migrated = parsed.map(cargo => {
        const defaults = DEFAULT_SYSTEM_PERMISSIONS[cargo.roleType] || DEFAULT_SYSTEM_PERMISSIONS.recepcao;
        const modules = Object.keys(defaults) as Array<keyof SystemPermissions>;
        const permissoes = { ...cargo.permissoes } as SystemPermissions;
        modules.forEach(module => {
          if (!permissoes[module]) { changed = true; permissoes[module] = { ...defaults[module] }; }
          else permissoes[module] = { ...defaults[module], ...permissoes[module] };
        });
        if (!cargo.permissoes?.registroAtividades) {
          const legacyAccess = Boolean(cargo.permissoes?.configuracoes?.restrito);
          permissoes.registroAtividades = legacyAccess ? { ...VIEW_ONLY, restrito: true } : { ...defaults.registroAtividades };
        }
        return { ...cargo, permissoes };
      });
      if (changed) localStorage.setItem('cargos', JSON.stringify(migrated));
      return migrated;
    }
  } catch {}
  return DEFAULT_CARGOS;
}

export function saveCargos(cargos: Cargo[]): void {
  localStorage.setItem('cargos', JSON.stringify(cargos));
}

export function getCargoByRoleType(roleType: RoleType): Cargo | undefined {
  return getCargos().find(c => c.roleType === roleType);
}

// --- Permissões de um role (compatibilidade com Sidebar) ---
export interface RolePermissions {
  dashboard:      boolean;
  pacientes:      boolean;
  agendamento:    boolean;
  planos:         boolean;
  fisioterapeutas:boolean;
  financeiro:     boolean;
  relatorios:     boolean;
  configuracoes:  boolean;
  equipe:         boolean;
  cobrancas:      boolean;
}

export function getRolePermissions(role: RoleType): RolePermissions {
  const cargo = getCargoByRoleType(role);
  const p = cargo ? cargo.permissoes : DEFAULT_SYSTEM_PERMISSIONS[role];
  return {
    dashboard:       p.dashboard.visualizar,
    pacientes:       p.pacientes.visualizar,
    agendamento:     p.agendamento.visualizar,
    planos:          p.planos.visualizar,
    fisioterapeutas: p.equipe.visualizar,
    equipe:          p.equipe.visualizar,
    financeiro:      p.financeiro.visualizar,
    relatorios:      p.relatorios.visualizar,
    configuracoes:   p.configuracoes.visualizar,
    cobrancas:       p.cobrancas.visualizar,
  };
}

export function getSystemPermissions(role: RoleType): SystemPermissions {
  const cargo = getCargoByRoleType(role);
  return cargo ? cargo.permissoes : DEFAULT_SYSTEM_PERMISSIONS[role];
}

export function can(role: RoleType, module: keyof SystemPermissions, action: keyof ModulePermission): boolean {
  const perms = getSystemPermissions(role);
  return perms[module]?.[action] ?? false;
}

export function assertPermission(permission: ModulePermission | undefined, action: keyof ModulePermission, message = 'Voce nao possui permissao para realizar esta acao.'): void {
  if (permission?.[action] === false) throw new Error(message);
}

// Inicializa cargos padrão se não existirem
export function initCargos(): void {
  try {
    const stored = localStorage.getItem('cargos');
    if (!stored) localStorage.setItem('cargos', JSON.stringify(DEFAULT_CARGOS));
  } catch {}
}

// Legacy compat
export function setRolePermissions(role: RoleType, permissions: RolePermissions) {}
export function getAllRolePermissions(): Record<RoleType, RolePermissions> {
  const all: Record<string, RolePermissions> = {};
  (['gerencia','admin','fisio','recepcao'] as RoleType[]).forEach(r => { all[r] = getRolePermissions(r); });
  return all as Record<RoleType, RolePermissions>;
}
export function resetPermissionsToDefault() {
  localStorage.removeItem('cargos');
}
