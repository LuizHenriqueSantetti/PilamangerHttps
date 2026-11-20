import { useState, useEffect } from 'react';
import { LogOut, Shield, ChevronDown, User, Building2, Palette, Users, Lock, Globe, ShieldCheck, ScrollText, BookOpen, LayoutDashboard, Calendar, GraduationCap, CreditCard, Wallet, DollarSign, FileText } from 'lucide-react';
import { Sidebar } from './Sidebar';
import {Moon,Sun,ChevronRight} from 'lucide-react';
import {SyncStatus} from './SyncStatus';
import { AgendamentoView } from './AgendamentoView';
import { DashboardView } from './DashboardView';
import { PacientesView } from './PacientesView';
import { PlanosView } from './PlanosView';
import { ProfessoresView } from './ProfessoresView';
import { FinanceiroView } from './FinanceiroView';
import { RelatoriosView } from './RelatoriosView';
import { PagamentosView } from './PagamentosView';
import { BillingView } from './BillingView';
import { ConfiguracoesModal } from './ConfiguracoesModal';
import { AccessibilityMenu } from './AccessibilityMenu';
import { GlobalSearch } from './GlobalSearch';
import { AuditView } from './AuditView';
import { AccessLogsView } from './AccessLogsView';
import { ManualView } from './ManualView';
import { initCargos, getSystemPermissions, SystemPermissions } from '../utils/permissions';
import { notify } from '../utils/notifications';
import { authService } from '../services/authService';

interface DashboardProps {
  isDark: boolean;
  userEmail: string;
  userName: string;
  userRole: 'gerencia' | 'admin' | 'fisio' | 'recepcao';
  onLogout: () => void;
  onToggleTheme: () => void;
}

const MENU_LABELS: Record<string, string> = {
  dashboard: 'Visão Geral', agendamento: 'Agendamento', pacientes: 'Pacientes',
  equipe: 'Equipe', planos: 'Planos', cobrancas: 'Cobranças',
  financeiro: 'Financeiro', comissionamento: 'Comissionamento', relatorios: 'Relatórios',
  auditoria: 'Registro de Atividades', logs: 'Logs de Acesso', manual: 'Manual',
};

const ROLE_LABELS: Record<string, string> = {
  gerencia: 'Gerência', admin: 'Administrador', fisio: 'Fisioterapeuta', recepcao: 'Recepção'
};

const CONFIG_MENU = [
  { id: 'perfil',     label: 'Meu Perfil',          icon: User },
  { id: 'clinica',    label: 'Clínica',              icon: Building2 },
  { id: 'aparencia',  label: 'Aparência',            icon: Palette },
  { id: 'privacidade', label: 'Política de Privacidade', icon: ShieldCheck },
  { id: 'usuarios',   label: 'Usuários do Sistema',  icon: Users },
  { id: 'permissoes', label: 'Permissões',           icon: Shield },
  { id: 'seguranca',  label: 'Segurança',            icon: Lock },
  { id: 'idioma',     label: 'Idioma',               icon: Globe },
];

const SYSTEM_MENU = [
  { id: 'auditoria', label: 'Registro de Atividades', icon: ShieldCheck },
  { id: 'logs', label: 'Logs de Acesso', icon: ScrollText },
  { id: 'manual', label: 'Manual', icon: BookOpen },
];

const MOBILE_MENU = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, permission: 'dashboard' },
  { id: 'agendamento', label: 'Agenda', icon: Calendar, permission: 'agendamento' },
  { id: 'pacientes', label: 'Pacientes', icon: Users, permission: 'pacientes' },
  { id: 'equipe', label: 'Equipe', icon: GraduationCap, permission: 'equipe' },
  { id: 'planos', label: 'Planos', icon: CreditCard, permission: 'planos' },
  { id: 'cobrancas', label: 'Cobranças', icon: Wallet, permission: 'cobrancas' },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign, permission: 'financeiro' },
  { id: 'comissionamento', label: 'Comissionamento', icon: DollarSign, permission: 'financeiro' },
  { id: 'relatorios', label: 'Relatórios', icon: FileText, permission: 'relatorios' },
] as const;

export function Dashboard({ isDark, userEmail, userName, userRole, onLogout, onToggleTheme }: DashboardProps) {
  // Inicializar cargos e permissões padrão na primeira execução
  useEffect(() => { if (userRole === 'gerencia' || userRole === 'admin') initCargos(); }, [userRole]);

  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [academiaName, setAcademiaName] = useState('PilaManager');
  const [academiaDescription, setAcademiaDescription] = useState('PilaManager Studio');
  const [logoAcademia, setLogoAcademia] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configTab, setConfigTab] = useState('perfil');

  const SIDEBAR_EXPANDED = 248;
  const SIDEBAR_COLLAPSED = 68;
  const sidebarW = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  const [profileData, setProfileData] = useState({ nome: userName, role: userRole, email: userEmail, telefone: '' });

  // Permissões granulares do usuário atual
  const effectiveRole = profileData.role as 'gerencia' | 'admin' | 'fisio' | 'recepcao';
  const perms: SystemPermissions = getSystemPermissions(effectiveRole);

  useEffect(() => {
    const loadAcademiaData = () => {
      const d = localStorage.getItem('academiaData');
      if (!d) return;
      const p = JSON.parse(d);
      setAcademiaName(p.nomeExibicao || p.nome || 'PilaManager');
      setAcademiaDescription(p.descricaoClinica || 'PilaManager Studio');
      setLogoAcademia(p.logo || '');
    };
    loadAcademiaData();
    window.addEventListener('pilamanager:academia-updated', loadAcademiaData);
    return () => window.removeEventListener('pilamanager:academia-updated', loadAcademiaData);
  }, []);

  useEffect(() => {
    const refreshProfile = () => {
      const u = authService.getCurrentUser();
      setFotoPerfil(u?.foto || '');
      if (u) setProfileData({ nome: u.name || userName, role: u.role || userRole, email: u.email || userEmail, telefone: u.telefone || '' });
    };
    refreshProfile();
    window.addEventListener('pilamanager:profile-updated', refreshProfile);
    return () => window.removeEventListener('pilamanager:profile-updated', refreshProfile);
  }, [userEmail]);

  const handleLogout = () => { onLogout(); };
  const handleUpdateProfile = (data: { nome: string; email: string; telefone: string; role: string }) => setProfileData({ ...profileData, ...data, role: data.role as any });

  const openConfig = (tab: string) => { setConfigTab(tab); setShowConfig(true); setShowUserMenu(false); };
  const openSystemPage = (tab: string) => { setActiveMenu(tab); setShowUserMenu(false); };
  const handleGlobalNavigate = (module: string, recordId?: string) => {
    setActiveMenu(module);
    window.dispatchEvent(new CustomEvent('pilamanager:open-record', { detail: { module, recordId } }));
  };

  const displayRole = profileData.role;

  const P = isDark ? '#67C8CE' : '#087F8C';
  const bg = isDark ? '#0B1426' : '#F4F8FB';
  const headerBg = isDark ? '#111F35' : '#FFFFFF';
  const headerBorder = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';
  const cardBg = isDark ? '#182B43' : '#FFFFFF';
  const cardBorder = isDark ? '#31455F' : '#E4EDF3';
  const mobileMenuItems = MOBILE_MENU.filter(item => perms[item.permission].visualizar);

  const renderContent = () => {
    // Verifica se usuário tem acesso à área atual
    const areaPerms: Record<string, boolean> = {
      dashboard: perms.dashboard.visualizar,
      agendamento: perms.agendamento.visualizar,
      pacientes: perms.pacientes.visualizar,
      equipe: perms.equipe.visualizar,
      planos: perms.planos.visualizar,
      cobrancas: perms.cobrancas.visualizar,
      financeiro: perms.financeiro.visualizar,
      comissionamento: perms.financeiro.visualizar && ['gerencia', 'admin'].includes(profileData.role),
      relatorios: perms.relatorios.visualizar,
    };
    if (activeMenu in areaPerms && !areaPerms[activeMenu]) {
      return (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: textSub }}>
          <Shield className="w-12 h-12 mb-4 opacity-30" />
          <p className="font-semibold text-lg mb-1" style={{ color: textMain }}>Acesso Restrito</p>
          <p className="text-sm">Você não possui permissão para acessar esta área.</p>
        </div>
      );
    }
    switch (activeMenu) {
      case 'dashboard':   return <DashboardView isDark={isDark} />;
      case 'agendamento': return <AgendamentoView isDark={isDark} perms={perms.agendamento} />;
      case 'pacientes':   return <PacientesView isDark={isDark} perms={perms.pacientes} />;
      case 'equipe':      return <ProfessoresView isDark={isDark} perms={perms.equipe} canViewSchedule={perms.agendamento.visualizar} />;
      case 'planos':      return <PlanosView isDark={isDark} perms={perms.planos} canViewPatients={perms.pacientes.visualizar} onOpenPatient={perms.pacientes.visualizar ? id => handleGlobalNavigate('pacientes', id) : undefined} />;
      case 'cobrancas':   return <BillingView isDark={isDark} userRole={profileData.role} />;
      case 'comissionamento': return <BillingView commissions isDark={isDark} userRole={profileData.role} />;
      case 'financeiro':  return <FinanceiroView isDark={isDark} perms={perms.financeiro} />;
      case 'relatorios':  return <RelatoriosView isDark={isDark} perms={perms.relatorios} />;
      case 'auditoria':   return perms.registroAtividades.visualizar ? <AuditView isDark={isDark} showOtherUsers={perms.registroAtividades.restrito} /> : <div className="p-8 text-center py-20" style={{ color: textSub }}>Você não possui permissão para acessar o Registro de Atividades.</div>;
      case 'logs':        return perms.configuracoes.restrito ? <AccessLogsView isDark={isDark} /> : <div className="p-8 text-center py-20" style={{ color: textSub }}>Acesso restrito.</div>;
      case 'manual':      return <ManualView isDark={isDark} />;
      default:            return <div className="p-8 text-center py-20" style={{ color: textSub }}>Em desenvolvimento...</div>;
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: bg }}>
      <Sidebar
        isDark={isDark}
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
        userRole={userRole}
        academiaName={academiaName}
        academiaDescription={academiaDescription}
        logoAcademia={logoAcademia}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div
        className="pilamanager-app-frame flex flex-col h-screen overflow-x-hidden"
        style={{
          marginLeft: `${sidebarW}px`,
          width: `calc(100vw - ${sidebarW}px)`,
          transition: 'margin-left 0.3s ease, width 0.3s ease',
        }}
      >
        {/* Header */}
        <header className="flex-shrink-0" style={{ backgroundColor: headerBg, borderBottom: `1px solid ${headerBorder}`, zIndex: 30 }}>
          <div className="pilamanager-header px-6 h-14 flex items-center justify-between gap-4">
            <div className="pilamanager-header-search">
              <GlobalSearch isDark={isDark} perms={perms} onNavigate={handleGlobalNavigate} />
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <SyncStatus/>
              <button className="pm-theme-button" type="button" onClick={onToggleTheme} aria-label={isDark?'Ativar modo claro':'Ativar modo escuro'} title={isDark?'Modo claro':'Modo escuro'}><span className="pm-theme-symbol" data-dark={isDark} aria-hidden="true">{isDark?<Sun size={17}/>:<Moon size={17}/>}</span></button>
              <AccessibilityMenu isDark={isDark} onToggleTheme={onToggleTheme} />
              <div className="w-px h-5 mx-1" style={{ backgroundColor: headerBorder }} />

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="pm-user-trigger flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                  aria-expanded={showUserMenu}
                  aria-controls="pm-user-menu"
                >
                  {fotoPerfil ? (
                    <img src={fotoPerfil} alt="Foto de perfil" className="pm-header-avatar rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${P}` }} />
                  ) : (
                    <div className="pm-header-avatar rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: P, fontSize: '0.85rem' }}>
                      {profileData.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-left min-w-0 max-w-40">
                    <p className="truncate" title={profileData.nome} style={{ color: textMain, fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.2 }}>{profileData.nome}</p>
                    <p style={{ color: textSub, fontSize: '0.68rem', lineHeight: 1.2 }}>{ROLE_LABELS[displayRole] || displayRole}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 hidden sm:block" style={{ color: textSub }} />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div id="pm-user-menu" className="pilamanager-user-menu absolute right-0 top-full z-50" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }} onKeyDown={event => { if (event.key === 'Escape') setShowUserMenu(false); }}>
                      {/* User info */}
                      <div className="pm-user-identity">
                        {fotoPerfil ? <img className="pm-user-avatar" src={fotoPerfil} alt=""/> : <span className="pm-user-avatar" aria-hidden="true">{profileData.nome.charAt(0).toUpperCase()}</span>}
                        <div className="min-w-0">
                          <p className="pm-user-name truncate" title={profileData.nome}>{profileData.nome}</p>
                          <p className="pm-user-email truncate" title={profileData.email}>{profileData.email}</p>
                          <span className="pm-user-role">{ROLE_LABELS[displayRole] || displayRole}</span>
                        </div>
                      </div>

                      {/* Config items */}
                      {[CONFIG_MENU.slice(0, 4), CONFIG_MENU.slice(4)].map((group, index) => <div className="pm-user-menu-group" key={index}>
                        {group.filter(item => {
                          if (item.id === 'usuarios') return perms.usuarios.visualizar;
                          if (item.id === 'permissoes') return profileData.role === 'gerencia';
                          if (item.id === 'clinica') return perms.configuracoes.visualizar;
                          return true;
                        }).map(item => {
                          const Ic = item.icon;
                          return (
                            <button key={item.id} onClick={() => openConfig(item.id)} className="pm-user-menu-item">
                              <Ic aria-hidden="true"/>
                              <span>{item.label}</span><ChevronRight className="pm-user-menu-arrow" aria-hidden="true"/>
                            </button>
                          );
                        })}
                      </div>)}

                      <div className="pm-user-menu-group">
                        {SYSTEM_MENU.map(item => {
                          const Ic = item.icon;
                          const blocked = item.id === 'auditoria' ? !perms.registroAtividades.visualizar : item.id === 'logs' ? !perms.configuracoes.restrito : false;
                          return (
                            <button key={item.id} disabled={blocked} onClick={() => openSystemPage(item.id)} className="pm-user-menu-item disabled:opacity-45 disabled:cursor-not-allowed">
                              <Ic aria-hidden="true"/>
                              <span>{item.label}</span><ChevronRight className="pm-user-menu-arrow" aria-hidden="true"/>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pm-user-menu-group pm-user-menu-exit">
                        <button onClick={() => { setShowUserMenu(false); handleLogout(); }} className="pm-user-menu-item">
                          <LogOut aria-hidden="true"/>
                          <span>Sair do sistema</span><ChevronRight className="pm-user-menu-arrow" aria-hidden="true"/>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="pilamanager-mobile-switcher lg:hidden" style={{ borderTop: `1px solid ${headerBorder}` }}>
            <label className="sr-only" htmlFor="mobile-module-select">Tela do sistema</label>
            <select
              id="mobile-module-select"
              value={activeMenu}
              onChange={event => setActiveMenu(event.target.value)}
              className="w-full rounded-xl border px-3 py-3 text-sm font-semibold outline-none"
              style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textMain }}
            >
              {mobileMenuItems.map(item => (
                <option key={item.id} value={item.id}>{MENU_LABELS[item.id] || item.label}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Content */}
        <main data-module={activeMenu} className="pilamanager-main-content flex-1 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: bg }}>
          <nav className="pm-breadcrumb pm-content-breadcrumb" aria-label="Localização">
            <span>Estúdio</span><ChevronRight size={13}/><strong>{MENU_LABELS[activeMenu] || activeMenu}</strong>
          </nav>
          {renderContent()}
        </main>
      </div>

      {showConfig && (
        <ConfiguracoesModal
          isDark={isDark}
          onClose={() => setShowConfig(false)}
          onToggleTheme={onToggleTheme}
          userEmail={profileData.email}
          userName={profileData.nome}
          userRole={profileData.role}
          onUpdateProfile={handleUpdateProfile}
          initialTab={configTab}
          permissions={perms}
        />
      )}
    </div>
  );
}
