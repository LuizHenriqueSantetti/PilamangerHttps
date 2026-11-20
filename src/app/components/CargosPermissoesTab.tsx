import { useState } from 'react';
import {
  Shield, Plus, Edit2, Trash2, Power, Copy, Check, X,
  ChevronRight, Users, AlertTriangle, Info
} from 'lucide-react';
import {
  Cargo, ModulePermission, SystemPermissions, RoleType,
  getCargos, saveCargos, DEFAULT_CARGOS, FULL, NO_ACCESS,
  DEFAULT_SYSTEM_PERMISSIONS
} from '../utils/permissions';
import { UserData } from '../types/auth';
import { notify, performAction, confirmAction } from '../utils/notifications';
import { authService } from '../services/authService';

interface CargosPermissoesTabProps {
  isDark: boolean;
  userRole: string;
  isGerencia: boolean;
}

type SystemUser = UserData;

const MODULES: { key: keyof SystemPermissions; label: string }[] = [
  { key: 'dashboard',     label: 'Visão Geral'        },
  { key: 'agendamento',   label: 'Agendamento'        },
  { key: 'pacientes',     label: 'Pacientes'          },
  { key: 'equipe',        label: 'Equipe'             },
  { key: 'planos',        label: 'Planos'             },
  { key: 'cobrancas',     label: 'Cobranças'          },
  { key: 'financeiro',    label: 'Financeiro'         },
  { key: 'relatorios',    label: 'Relatórios'         },
  { key: 'configuracoes', label: 'Configurações'      },
  { key: 'usuarios',      label: 'Usuários e Permissões' },
  { key: 'registroAtividades', label: 'Registro de Atividades' },
];

const ACTIONS: { key: keyof ModulePermission; label: string; short: string }[] = [
  { key: 'visualizar', label: 'Visualizar', short: 'Ver'  },
  { key: 'criar',      label: 'Criar',      short: 'Criar'},
  { key: 'editar',     label: 'Editar',     short: 'Edit' },
  { key: 'excluir',    label: 'Excluir',    short: 'Del'  },
  { key: 'exportar',   label: 'Exportar',   short: 'Exp'  },
  { key: 'restrito',   label: 'Dados Restritos', short: 'Res'},
];

function emptyPerms(): SystemPermissions {
  const p: any = {};
  MODULES.forEach(m => { p[m.key] = { ...NO_ACCESS }; });
  return p as SystemPermissions;
}

function countUsersWithRole(roleType: RoleType): number {
  const users: SystemUser[] = authService.listUsers();
  return users.filter(u => u.role === roleType).length;
}

export function CargosPermissoesTab({ isDark, isGerencia }: CargosPermissoesTabProps) {
  const P = isDark ? '#67C8CE' : '#087F8C';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const muted = isDark ? '#111F35' : '#EEF6FA';
  const inputBg = isDark ? '#203650' : '#F7FAFC';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';

  const [cargos, setCargosState] = useState<Cargo[]>(() => getCargos());
  const [selectedCargo, setSelectedCargo] = useState<Cargo | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Cargo | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRoleType, setNewRoleType] = useState<RoleType>('recepcao');
  const [deleteConfirm, setDeleteConfirm] = useState<Cargo | null>(null);
  const [duplicateFrom, setDuplicateFrom] = useState('');

  const toast = (msg: string) => notify(msg, 'info');

  const persist = async (updated: Cargo[], message: string) => {
    if (!await performAction('roles', () => saveCargos(updated), message)) return false;
    setCargosState(updated); return true;
  };

  const startEdit = (c: Cargo) => {
    setEditData(JSON.parse(JSON.stringify(c)));
    setSelectedCargo(c);
    setEditMode(true);
  };

  const cancelEdit = () => { setEditMode(false); setEditData(null); };

  const saveEdit = async () => {
    if (!editData) return;
    const updated = cargos.map(c => c.id === editData.id ? editData : c);
    if (!await persist(updated, 'Cargo e permissões atualizados.')) return;
    setSelectedCargo(editData);
    setEditMode(false);
    setEditData(null);
  };

  const toggleCargo = async (id: string) => {
    if (cargos.find(c => c.id === id)?.ativo && !await confirmAction('Desativar este cargo?')) return;
    const updated = cargos.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c);
    if (!await persist(updated, 'Situação do cargo atualizada.')) return;
    if (selectedCargo?.id === id) setSelectedCargo(updated.find(c => c.id === id) || null);
  };

  const createCargo = async () => {
    if (!newNome.trim()) { alert('Informe o nome do cargo.'); return; }
    const id = Date.now().toString();
    const novoCargo: Cargo = {
      id, nome: newNome.trim(), descricao: newDesc.trim(),
      ativo: true, sistema: false, roleType: newRoleType,
      permissoes: JSON.parse(JSON.stringify(DEFAULT_SYSTEM_PERMISSIONS[newRoleType] || emptyPerms())),
    };
    const updated = [...cargos, novoCargo];
    if (!await persist(updated, 'Cargo criado.')) return;
    setShowNewForm(false);
    setNewNome(''); setNewDesc(''); setNewRoleType('recepcao');
  };

  const confirmDelete = (c: Cargo) => {
    const count = countUsersWithRole(c.roleType);
    if (c.roleType === 'gerencia' && count > 0) {
      alert(`Não é possível excluir o cargo de Gerência enquanto há ${count} usuário(s) com este cargo.`);
      return;
    }
    setDeleteConfirm(c);
  };

  const doDelete = async () => {
    if (!deleteConfirm) return;
    const updated = cargos.filter(c => c.id !== deleteConfirm.id);
    if (!await persist(updated, 'Cargo excluído.')) return;
    if (selectedCargo?.id === deleteConfirm.id) { setSelectedCargo(null); setEditMode(false); }
    setDeleteConfirm(null);
  };

  const setPermAction = (module: keyof SystemPermissions, action: keyof ModulePermission, val: boolean) => {
    if (!editData) return;
    const p = { ...editData.permissoes[module], [action]: val };
    // Se desmarca visualizar, desmarca tudo
    if (action === 'visualizar' && !val) {
      Object.keys(p).forEach(k => { (p as any)[k] = false; });
    }
    // Se marca qualquer ação, marca também visualizar
    if (action !== 'visualizar' && val) p.visualizar = true;
    setEditData({ ...editData, permissoes: { ...editData.permissoes, [module]: p } });
  };

  const setAllModule = (module: keyof SystemPermissions, val: boolean) => {
    if (!editData) return;
    const p: ModulePermission = { visualizar: val, criar: val, editar: val, excluir: val, exportar: val, restrito: val, manage_class_payment_status: val };
    setEditData({ ...editData, permissoes: { ...editData.permissoes, [module]: p } });
  };

  const duplicatePerms = () => {
    if (!editData || !duplicateFrom) return;
    const source = cargos.find(c => c.id === duplicateFrom);
    if (!source) return;
    setEditData({ ...editData, permissoes: JSON.parse(JSON.stringify(source.permissoes)) });
    setDuplicateFrom('');
    toast('Permissões copiadas!');
  };

  if (!isGerencia) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(229,168,59,0.12)' }}>
          <Shield className="w-7 h-7" style={{ color: '#E5A83B' }} />
        </div>
        <p className="font-semibold mb-1" style={{ color: textMain }}>Acesso Restrito</p>
        <p className="text-sm text-center" style={{ color: textSub }}>Somente usuários com cargo de Gerência podem gerenciar cargos e permissões.</p>
      </div>
    );
  }

  const activeData = editMode ? editData : selectedCargo;

  return (
    <div className="permissions-layout flex h-full min-w-0 gap-0" style={{ minHeight: 0 }}>
      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="pm-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(217,92,92,0.12)' }}>
                <AlertTriangle className="w-4 h-4" style={{ color: '#D95C5C' }} />
              </div>
              <p className="font-semibold" style={{ color: textMain }}>Excluir Cargo</p>
            </div>
            <p className="text-sm mb-2" style={{ color: textMain }}>Deseja excluir o cargo <strong>"{deleteConfirm.nome}"</strong>?</p>
            {countUsersWithRole(deleteConfirm.roleType) > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl mb-3 text-sm" style={{ backgroundColor: 'rgba(229,168,59,0.1)', color: '#E5A83B' }}>
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{countUsersWithRole(deleteConfirm.roleType)} usuário(s) com este cargo perderão permissões associadas.</span>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: border, color: textSub }}>Cancelar</button>
              <button onClick={doDelete} className="px-4 py-2 rounded-xl text-sm text-white font-medium" style={{ backgroundColor: '#D95C5C' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Left column: cargo list */}
      <div className="permissions-role-list w-52 flex-shrink-0 flex flex-col border-r overflow-y-auto" style={{ borderColor: border }}>
        <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: border }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: textSub }}>Cargos</p>
          <button onClick={() => setShowNewForm(!showNewForm)} className="w-6 h-6 rounded-lg flex items-center justify-center transition-all" style={{ backgroundColor: `${P}18`, color: P }} title="Novo cargo">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {showNewForm && (
          <div className="p-3 border-b space-y-2" style={{ borderColor: border, backgroundColor: muted }}>
            <input value={newNome} onChange={e => setNewNome(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} placeholder="Nome do cargo" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} placeholder="Descrição" />
            <select value={newRoleType} onChange={e => setNewRoleType(e.target.value as RoleType)} className="w-full px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }}>
              <option value="recepcao">Recepção</option>
              <option value="fisio">Fisioterapeuta</option>
              <option value="admin">Administrador</option>
              <option value="gerencia">Gerência</option>
            </select>
            <div className="flex gap-1.5">
              <button onClick={createCargo} className="flex-1 py-1.5 rounded-lg text-xs text-white font-medium" style={{ backgroundColor: P }}>Criar</button>
              <button onClick={() => setShowNewForm(false)} className="flex-1 py-1.5 rounded-lg text-xs border" style={{ borderColor: border, color: textSub }}>Cancelar</button>
            </div>
          </div>
        )}

        <div className="permissions-role-options flex-1 py-1">
          {cargos.map(c => {
            const isActive = selectedCargo?.id === c.id;
            const count = countUsersWithRole(c.roleType);
            return (
              <button key={c.id} onClick={() => { if (!editMode) { setSelectedCargo(c); } }} className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all" style={{ backgroundColor: isActive ? `${P}15` : 'transparent', opacity: c.ativo ? 1 : 0.55 }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = muted; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: isActive ? P : textMain }}>{c.nome}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {!c.ativo && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(217,92,92,0.1)', color: '#D95C5C', fontSize: '0.6rem' }}>Inativo</span>}
                    <span className="text-xs" style={{ color: textSub, fontSize: '0.65rem' }}>{count} usuário{count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: P }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right column: permissions */}
      <div className="permissions-detail min-w-0 flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        {!activeData ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Shield className="w-10 h-10 mb-3 opacity-20" style={{ color: P }} />
            <p className="text-sm" style={{ color: textSub }}>Selecione um cargo para ver e editar as permissões.</p>
          </div>
        ) : (
          <>
            {/* Header do cargo */}
            <div className="permissions-role-header px-5 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: border }}>
              <div className="flex-1 min-w-0">
                {editMode ? (
                  <div className="space-y-2">
                    <input value={editData!.nome} onChange={e => setEditData({ ...editData!, nome: e.target.value })} className="w-full px-3 py-1.5 rounded-lg border text-sm font-semibold focus:outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} />
                    <input value={editData!.descricao} onChange={e => setEditData({ ...editData!, descricao: e.target.value })} className="w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} placeholder="Descrição" />
                  </div>
                ) : (
                  <>
                    <p className="font-semibold" style={{ color: textMain }}>{activeData.nome}</p>
                    <p className="text-xs" style={{ color: textSub }}>{activeData.descricao || 'Sem descrição'} · {countUsersWithRole(activeData.roleType)} usuário(s)</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {editMode ? (
                  <>
                    <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-white font-medium" style={{ backgroundColor: P }}>
                      <Check className="w-3.5 h-3.5" />Salvar
                    </button>
                    <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border" style={{ borderColor: border, color: textSub }}>
                      <X className="w-3.5 h-3.5" />Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(activeData)} className="p-1.5 rounded-lg transition-all" style={{ color: textSub }} onMouseEnter={e => { e.currentTarget.style.color = P; e.currentTarget.style.backgroundColor = `${P}15`; }} onMouseLeave={e => { e.currentTarget.style.color = textSub; e.currentTarget.style.backgroundColor = 'transparent'; }} title="Editar permissões">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleCargo(activeData.id)} className="p-1.5 rounded-lg transition-all" style={{ color: activeData.ativo ? '#35A978' : '#D95C5C' }} title={activeData.ativo ? 'Desativar cargo' : 'Ativar cargo'}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    {!activeData.sistema && (
                      <button onClick={() => confirmDelete(activeData)} className="p-1.5 rounded-lg transition-all" style={{ color: textSub }} onMouseEnter={e => { e.currentTarget.style.color = '#D95C5C'; e.currentTarget.style.backgroundColor = 'rgba(217,92,92,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = textSub; e.currentTarget.style.backgroundColor = 'transparent'; }} title="Excluir cargo">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {activeData.sistema && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${P}12`, color: P }}>Sistema</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Duplicar permissões */}
            {editMode && (
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: border, backgroundColor: muted }}>
                <Copy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textSub }} />
                <span className="text-xs" style={{ color: textSub }}>Copiar permissões de:</span>
                <select value={duplicateFrom} onChange={e => setDuplicateFrom(e.target.value)} className="flex-1 px-2.5 py-1 rounded-lg border text-xs focus:outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }}>
                  <option value="">Selecione um cargo...</option>
                  {cargos.filter(c => c.id !== editData?.id).map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <button onClick={duplicatePerms} disabled={!duplicateFrom} className="px-3 py-1 rounded-lg text-xs text-white font-medium disabled:opacity-40" style={{ backgroundColor: P }}>Copiar</button>
              </div>
            )}

            {/* Matrix de permissões */}
            <div className="permissions-matrix flex-1 overflow-x-hidden">
              <table className="permissions-table w-full">
                <thead>
                  <tr style={{ backgroundColor: muted, borderBottom: `1px solid ${border}` }}>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: textSub, width: '140px' }}>Módulo</th>
                    {ACTIONS.map(a => (
                      <th key={a.key} className="px-2 py-2.5 text-center text-xs font-semibold" style={{ color: textSub }}>
                        <span className="hidden sm:inline">{a.label}</span>
                        <span className="sm:hidden">{a.short}</span>
                      </th>
                    ))}
                    {editMode && <th className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: textSub }}>Todos</th>}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, mi) => {
                    const perm = editMode ? editData!.permissoes[mod.key] : activeData.permissoes[mod.key];
                    const allOn = ACTIONS.every(a => perm[a.key]);
                    return (
                      <tr key={mod.key} style={{ borderBottom: `1px solid ${border}`, backgroundColor: mi % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
                        <td className="permissions-module-name px-5 py-2.5" data-label="Módulo">
                          <span className="text-sm font-medium" style={{ color: perm.visualizar ? textMain : textSub, opacity: perm.visualizar ? 1 : 0.6 }}>{mod.label}</span>
                        </td>
                        {ACTIONS.map(action => (
                          <td key={action.key} className="px-2 py-2.5 text-center" data-label={action.label}>
                            {editMode ? (
                              <button onClick={() => setPermAction(mod.key, action.key, !perm[action.key])} className="w-5 h-5 rounded flex items-center justify-center mx-auto border-2 transition-all" style={{ backgroundColor: perm[action.key] ? P : 'transparent', borderColor: perm[action.key] ? P : border }}>
                                {perm[action.key] && <Check className="w-3 h-3 text-white" />}
                              </button>
                            ) : (
                              <div className="w-5 h-5 rounded flex items-center justify-center mx-auto" style={{ backgroundColor: perm[action.key] ? `${P}15` : 'transparent' }}>
                                {perm[action.key] ? <Check className="w-3 h-3" style={{ color: P }} /> : <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: border }} />}
                              </div>
                            )}
                          </td>
                        ))}
                        {editMode && (
                          <td className="px-3 py-2.5 text-center" data-label="Todas as permissões">
                            <button onClick={() => setAllModule(mod.key, !allOn)} className="px-2 py-0.5 rounded text-xs font-medium transition-all" style={{ backgroundColor: allOn ? `${P}15` : muted, color: allOn ? P : textSub }}>
                              {allOn ? 'Remover' : 'Marcar'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
