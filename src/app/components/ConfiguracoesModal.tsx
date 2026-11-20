import { useEffect, useState, useRef } from 'react';
import {
  X, User, Building2, Palette, Users, Shield, Lock, Globe,
  Camera, Eye, EyeOff, Check, Plus, Trash2, Edit2, Power,
  Sun, Moon, Phone, Mail, MapPin, Clock, Info, FileText
} from 'lucide-react';
import { CargosPermissoesTab } from './CargosPermissoesTab';
import { getCargos, DEFAULT_CARGOS, SystemPermissions } from '../utils/permissions';
import { isValidPhone, maskPhone } from '../utils/masks';
import { readThemeMotionPreference, saveThemeMotionPreference, ThemeMotionPreference } from '../utils/themeTransition';
import { notify, notifyError, performAction, confirmAction } from '../utils/notifications';
import { authService } from '../services/authService';
import { persistImage, prepareImage } from '../services/imageService';
import { UserData } from '../types/auth';
import { evaluatePasswordStrength } from '../utils/security';
import { Language, useI18n } from '../i18n/I18nProvider';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { PRIVACY_CONSENT_TEXT, PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_TITLE } from '../utils/privacy';

interface ConfiguracoesModalProps {
  isDark: boolean;
  onClose: () => void;
  onToggleTheme: () => void;
  userEmail: string;
  userName: string;
  userRole: string;
  onUpdateProfile: (data: { nome: string; email: string; telefone: string; role: string }) => void;
  initialTab?: string;
  permissions?: SystemPermissions;
}

type SystemUser = UserData;

const TABS = [
  { id: 'perfil',    label: 'Meu Perfil',           icon: User },
  { id: 'clinica',   label: 'Clínica',               icon: Building2 },
  { id: 'aparencia', label: 'Aparência',             icon: Palette },
  { id: 'privacidade', label: 'Política de Privacidade', icon: FileText },
  { id: 'usuarios',  label: 'Usuários do Sistema',   icon: Users },
  { id: 'permissoes',label: 'Cargos e Permissões',   icon: Shield },
  { id: 'seguranca', label: 'Segurança',             icon: Lock },
  { id: 'idioma',    label: 'Idioma',                icon: Globe },
];

const ROLE_LABELS: Record<string, string> = {
  gerencia: 'Gerência', admin: 'Administrador', fisio: 'Fisioterapeuta', recepcao: 'Recepção'
};

export function ConfiguracoesModal({ isDark, onClose, onToggleTheme, userEmail, userName, userRole, onUpdateProfile, initialTab = 'perfil', permissions }: ConfiguracoesModalProps) {
  const { language, setLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [themeMotion, setThemeMotion] = useState<ThemeMotionPreference>(readThemeMotionPreference);
  const P = isDark ? '#67C8CE' : '#087F8C';
  const bg = isDark ? '#0B1426' : '#F4F8FB';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const inputBg = isDark ? '#203650' : '#F7FAFC';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';
  const sidebarBg = isDark ? '#111F35' : '#EEF6FA';
  const visibleTabs = TABS.filter(tab => tab.id === 'perfil' || tab.id === 'aparencia' || tab.id === 'privacidade' || tab.id === 'seguranca' || tab.id === 'idioma' || (tab.id === 'clinica' && permissions?.configuracoes.visualizar !== false) || (tab.id === 'usuarios' && permissions?.usuarios.visualizar !== false) || (tab.id === 'permissoes' && userRole === 'gerencia'));
  useEffect(() => { if (!visibleTabs.some(tab => tab.id === activeTab)) setActiveTab('perfil'); }, [activeTab, userRole, permissions]);

  // Perfil
  const [perfNome, setPerfNome] = useState(userName);
  const [perfEmail, setPerfEmail] = useState(userEmail);
  const [perfTel, setPerfTel] = useState(() => maskPhone(authService.getCurrentUser()?.telefone || ''));
  const [perfFoto, setPerfFoto] = useState('');
  const [perfSaved, setPerfSaved] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);

  // Clínica
  const [clinNome, setCliNome] = useState(() => { try { return JSON.parse(localStorage.getItem('academiaData') || '{}').nome || ''; } catch { return ''; } });
  const [clinNomeExibicao, setCliNomeExibicao] = useState(() => { try { return JSON.parse(localStorage.getItem('academiaData') || '{}').nomeExibicao || 'PilaManager'; } catch { return 'PilaManager'; } });
  const [clinDescricao, setCliDescricao] = useState(() => { try { return JSON.parse(localStorage.getItem('academiaData') || '{}').descricaoClinica || 'PilaManager Studio'; } catch { return 'PilaManager Studio'; } });
  const [clinTel, setCliNTel] = useState(() => { try { return JSON.parse(localStorage.getItem('academiaData') || '{}').telefone || ''; } catch { return ''; } });
  const [clinEnd, setCliEnd] = useState(() => { try { return JSON.parse(localStorage.getItem('academiaData') || '{}').endereco || ''; } catch { return ''; } });
  const [clinHor, setCliHor] = useState(() => { try { return JSON.parse(localStorage.getItem('academiaData') || '{}').horarios || ''; } catch { return ''; } });
  const [clinLogo, setCliLogo] = useState(() => { try { return JSON.parse(localStorage.getItem('academiaData') || '{}').logo || ''; } catch { return ''; } });
  const [clinSaved, setCliSaved] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [clinicSaving, setClinicSaving] = useState(false);

  // Usuários
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPwd, setUPwd] = useState('');
  const [uRole, setURole] = useState<SystemUser['role']>('recepcao');
  const [uError, setUError] = useState('');
  const [showUPwd, setShowUPwd] = useState(false);

  // Segurança
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Idioma
  const [idioma, setIdioma] = useState<Language>(language);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setPerfNome(user?.name || userName);
    setPerfEmail(user?.email || userEmail);
    setPerfTel(maskPhone(user?.telefone || ''));
    setPerfFoto(user?.foto || '');
  }, [userEmail, userName]);

  useEffect(() => {
    if (!visibleTabs.some(tab => tab.id === 'usuarios')) return;
    authService.refreshUsers().then(setUsers).catch(error => { setUsers([]); notifyError(error, 'Não foi possível carregar os usuários.'); });
  }, [userRole]);

  useEffect(() => setIdioma(language), [language]);

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageBusy(true); setPerfSaved(false);
    try { setPerfFoto(await prepareImage(file)); }
    catch (error) { notifyError(error, 'Não foi possível preparar a foto.'); }
    finally { setImageBusy(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageBusy(true); setCliSaved(false);
    try { setCliLogo(await prepareImage(file)); }
    catch (error) { notifyError(error, 'Não foi possível preparar a logo.'); }
    finally { setImageBusy(false); }
  };

  const savePerfil = async () => {
    if (imageBusy || profileSaving) return;
    if (perfTel && !isValidPhone(perfTel)) {
      alert('Informe um telefone válido com DDD.');
      return;
    }
    setProfileSaving(true);
    let saved: boolean;
    try { saved = await performAction('profile', async () => {
      const foto = await persistImage(perfFoto, 'profile');
      setPerfFoto(foto);
      await authService.updateUser(userEmail, { name: perfNome, email: perfEmail, role: userRole as SystemUser['role'], telefone: maskPhone(perfTel), foto });
    }, 'Perfil atualizado.'); }
    finally { setProfileSaving(false); }
    if (!saved) return;
    onUpdateProfile({ nome: perfNome, email: perfEmail, telefone: maskPhone(perfTel), role: userRole });
    setPerfSaved(true);
    setTimeout(() => setPerfSaved(false), 2000);
  };

  const saveClinica = async () => {
    if (imageBusy || clinicSaving) return;
    setClinicSaving(true);
    let saved: boolean;
    try { saved = await performAction('clinic', async () => {
      const logo = await persistImage(clinLogo, 'studio');
      setCliLogo(logo);
      const previous = JSON.parse(localStorage.getItem('academiaData') || '{}');
      const data = { ...previous, nome: clinNome, nomeExibicao: clinNomeExibicao || 'PilaManager', descricaoClinica: clinDescricao || 'PilaManager Studio', telefone: clinTel, endereco: clinEnd, horarios: clinHor, logo };
      localStorage.setItem('academiaData', JSON.stringify(data));
    }, 'Dados da clínica atualizados.'); }
    finally { setClinicSaving(false); }
    if (!saved) return;
    window.dispatchEvent(new Event('pilamanager:academia-updated'));
    setCliSaved(true);
    setTimeout(() => setCliSaved(false), 2000);
  };

  const openUserForm = (u?: SystemUser) => {
    if (u) { setEditingUser(u); setUName(u.name); setUEmail(u.email); setUPwd(''); setURole(u.role); }
    else { setEditingUser(null); setUName(''); setUEmail(''); setUPwd(''); setURole('recepcao'); }
    setUError('');
    setShowUserForm(true);
  };

  const saveUser = async () => {
    setUError('');
    const invalid = !uName.trim() || !uEmail.trim() ? 'Nome e e-mail são obrigatórios.'
      : (!editingUser && !uPwd) || (uPwd && !evaluatePasswordStrength(uPwd).isStrong) ? 'Informe uma senha forte.' : '';
    if (invalid) { setUError(invalid); notify(invalid, 'warning'); return; }
    if (!await performAction('users', async () => {
      if (editingUser) await authService.updateUser(editingUser.email, { name: uName, email: uEmail, role: uRole, password: uPwd || undefined, ativo: editingUser.ativo });
      else await authService.register({ name: uName, email: uEmail, password: uPwd, role: uRole });
    }, editingUser ? 'Usuário atualizado.' : 'Usuário cadastrado.')) return;
    setUsers(authService.listUsers()); setShowUserForm(false); setUPwd('');
  };

  const toggleUserStatus = async (email: string) => {
    const user = users.find(item => item.email === email);
    if (!user) return;
    if ((user.ativo ?? true) && !await confirmAction('Desativar este usuário? O acesso ao sistema será bloqueado.')) return;
    if (await performAction('users', () => authService.updateUser(email, { name: user.name, email: user.email, role: user.role, ativo: !(user.ativo ?? true), telefone: user.telefone, foto: user.foto }), 'Situação do usuário atualizada.')) setUsers(authService.listUsers());
  };

  const deleteUser = async (email: string) => {
    if (!await confirmAction('Excluir este usuário?')) return;
    if (await performAction('users', () => authService.deleteUser(email), 'Usuário excluído.')) setUsers(authService.listUsers());
  };

  const changePassword = async () => {
    setPwdMsg('');
    const invalid = !evaluatePasswordStrength(newPwd).isStrong ? 'Use 8 caracteres, maiúscula, minúscula, número e símbolo.' : newPwd !== confPwd ? 'As senhas não coincidem.' : '';
    if (invalid) { setPwdMsg(invalid); notify(invalid, 'warning'); return; }
    if (!await performAction('password', () => authService.updatePassword(userEmail, curPwd, newPwd), 'Senha alterada.')) return;
    setCurPwd(''); setNewPwd(''); setConfPwd('');
  };

  const saveIdioma = () => {
    setLanguage(idioma);
    const current = authService.getCurrentUser();
    if (current) authService.savePreferences(current.email, { ...authService.getPreferences(current.email), language: idioma });
    notify('Preferência de idioma atualizada neste dispositivo.', 'info');
  };

  const inputStyle = { backgroundColor: inputBg, borderColor: border, color: textMain };
  const labelStyle = { color: textMain };
  const subStyle = { color: textSub };

  const renderTab = () => {
    if (!visibleTabs.some(tab => tab.id === activeTab)) return null;
    switch (activeTab) {
      case 'perfil': return (
        <div className="space-y-5">
          <div>
            <p className="font-semibold mb-1" style={labelStyle}>Foto de Perfil</p>
            <div className="flex items-center gap-4">
              <div className="pm-settings-photo rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ backgroundColor: perfFoto ? 'transparent' : P }}>
                {perfFoto ? <img src={perfFoto} alt="foto" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-xl">{perfNome.charAt(0).toUpperCase()}</span>}
              </div>
              <button disabled={imageBusy || profileSaving} onClick={() => fotoRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all" style={{ borderColor: border, color: P }} onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#203650' : '#EDF5F7'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Camera className="w-4 h-4" />Alterar foto
              </button>
              <input ref={fotoRef} aria-label="Selecionar foto de perfil" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFotoUpload} />
            </div>
            <p className="text-xs mt-2" style={subStyle}>{imageBusy ? 'Preparando imagem…' : 'JPG, PNG ou WebP, até 10 MB. Após escolher, clique em Salvar Perfil.'}</p>
          </div>
          {[
            { label: 'Nome Completo', val: perfNome, set: setPerfNome, type: 'text', ph: 'Seu nome' },
            { label: 'E-mail', val: perfEmail, set: setPerfEmail, type: 'email', ph: 'seu@email.com' },
            { label: 'Telefone', val: perfTel, set: (value: string) => setPerfTel(maskPhone(value)), type: 'tel', ph: '(00) 00000-0000' },
          ].map(({ label, val, set, type, ph }) => (
            <div key={label}>
              <label className="block mb-1 text-sm font-medium" style={labelStyle}>{label}</label>
              <input type={type} inputMode={type === 'tel' ? 'numeric' : undefined} maxLength={type === 'tel' ? 15 : undefined} value={val} onChange={e => set(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border focus:outline-none" style={inputStyle} placeholder={ph} />
            </div>
          ))}
          <div>
            <label className="block mb-1 text-sm font-medium" style={labelStyle}>Cargo</label>
            <input type="text" value={ROLE_LABELS[userRole] || userRole} className="w-full px-4 py-2.5 rounded-xl border opacity-60 cursor-not-allowed" style={inputStyle} readOnly />
          </div>
          <button disabled={imageBusy || profileSaving} onClick={savePerfil} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-60" style={{ backgroundColor: P }}>
            {profileSaving ? 'Salvando perfil…' : perfSaved ? <><Check className="w-4 h-4" />Salvo!</> : 'Salvar Perfil'}
          </button>
        </div>
      );

      case 'clinica': return (
        <div className="space-y-5">
          <div>
            <p className="font-semibold mb-1" style={labelStyle}>Logo da Clínica</p>
            <div className="flex items-center gap-4">
              <div className="pm-settings-photo rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border" style={{ borderColor: border, backgroundColor: inputBg }}>
                {clinLogo ? <img src={clinLogo} alt="logo" className="w-full h-full object-contain" /> : <Building2 className="w-9 h-9" style={{ color: textSub }} />}
              </div>
              <button disabled={imageBusy || clinicSaving} onClick={() => logoRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all" style={{ borderColor: border, color: P }} onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#203650' : '#EDF5F7'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Camera className="w-4 h-4" />Alterar logo
              </button>
              <input ref={logoRef} aria-label="Selecionar logo da clínica" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
            </div>
            <p className="text-xs mt-2" style={subStyle}>{imageBusy ? 'Preparando imagem…' : 'JPG, PNG ou WebP, até 10 MB. Após escolher, clique em Salvar Clínica.'}</p>
          </div>
          {[
            { label: 'Nome exibido no sistema', val: clinNomeExibicao, set: setCliNomeExibicao, icon: Building2, ph: 'PilaManager' },
            { label: 'Descrição da clínica', val: clinDescricao, set: setCliDescricao, icon: Building2, ph: 'PilaManager Studio' },
            { label: 'Nome da Clínica', val: clinNome, set: setCliNome, icon: Building2, ph: 'Nome do estúdio' },
            { label: 'Telefone', val: clinTel, set: (value: string) => setCliNTel(maskPhone(value)), icon: Phone, ph: '(00) 00000-0000' },
            { label: 'Endereço', val: clinEnd, set: setCliEnd, icon: MapPin, ph: 'Rua, número, bairro, cidade' },
            { label: 'Horários de Funcionamento', val: clinHor, set: setCliHor, icon: Clock, ph: 'Ex: Seg–Sex 07h–20h, Sáb 08h–13h' },
          ].map(({ label, val, set, icon: Ic, ph }) => (
            <div key={label}>
              <label className="block mb-1 text-sm font-medium" style={labelStyle}>{label}</label>
              <div className="relative">
                <Ic className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textSub }} />
                <input type="text" value={val} onChange={e => set(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none" style={inputStyle} placeholder={ph} />
              </div>
            </div>
          ))}
          <button disabled={imageBusy || clinicSaving} onClick={saveClinica} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-60" style={{ backgroundColor: P }}>
            {clinicSaving ? 'Salvando clínica…' : clinSaved ? <><Check className="w-4 h-4" />Salvo!</> : 'Salvar Clínica'}
          </button>
        </div>
      );

      case 'aparencia': return (
        <div className="space-y-4">
          <p className="text-sm" style={subStyle}>Escolha o tema visual do sistema.</p>
          <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: border }}>
            <label htmlFor="theme-motion" className="block text-sm font-semibold" style={labelStyle}>Transição entre temas</label>
            <select id="theme-motion" value={themeMotion} onChange={event => {
              const preference = event.target.value as ThemeMotionPreference;
              try { saveThemeMotionPreference(preference); setThemeMotion(preference); notify('Preferência de transição atualizada neste dispositivo.', 'info'); }
              catch { notify('Não foi possível salvar a preferência neste navegador.', 'error'); }
            }} className="w-full rounded-xl border px-3 py-2.5" style={inputStyle}>
              <option value="auto">Seguir o sistema</option>
              <option value="smooth">Transição suave</option>
              <option value="off">Sem animação</option>
            </select>
            <p className="text-xs leading-relaxed" style={subStyle}>Se o sistema estiver reduzindo movimento, escolha Transição suave para animar somente as cores. A opção de acessibilidade Sem animações continua tendo prioridade.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'light', label: 'Tema Claro', icon: Sun, preview: '#F3F7F9', accent: '#087F8C' },
              { id: 'dark', label: 'Tema Escuro', icon: Moon, preview: '#0B1426', accent: '#67C8CE' },
            ].map(t => {
              const active = (t.id === 'dark') === isDark;
              const Ic = t.icon;
              return (
                <button key={t.id} onClick={() => { if (!active) onToggleTheme(); }} aria-pressed={active} className="rounded-xl p-4 border-2 transition-all text-left" style={{ backgroundColor: t.preview, borderColor: active ? t.accent : 'transparent' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: t.accent }}>
                    <Ic className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: t.id === 'dark' ? '#EDF4FC' : '#1A3047' }}>{t.label}</p>
                  {active && <p className="text-xs mt-0.5" style={{ color: t.accent }}>✓ Ativo</p>}
                </button>
              );
            })}
          </div>
        </div>
      );

      case 'privacidade': return (
        <div className="space-y-4">
          <div className="rounded-xl border p-4" style={{ borderColor: `${P}30`, backgroundColor: `${P}08` }}>
            <p className="text-sm font-bold" style={{ color: P }}>{PRIVACY_POLICY_TITLE}</p>
            <p className="mt-1 text-sm leading-relaxed" style={subStyle}>Consulte as regras de uso, privacidade e tratamento de dados pessoais no PilaManager.</p>
          </div>
          <div className="space-y-4">
            {PRIVACY_POLICY_SECTIONS.map(section => (
              <section key={section.title} className="rounded-xl border p-4" style={{ borderColor: border, backgroundColor: inputBg }}>
                <h3 className="text-sm font-bold uppercase" style={{ color: textMain }}>{section.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={subStyle}>{section.text}</p>
              </section>
            ))}
          </div>
          <p className="rounded-xl border p-3 text-sm" style={{ borderColor: border, color: textSub, backgroundColor: inputBg }}>
            Texto de aceite utilizado no sistema: "{PRIVACY_CONSENT_TEXT}"
          </p>
        </div>
      );

      case 'usuarios': return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={subStyle}>Gerencie contas de acesso ao sistema.</p>
            <button onClick={() => openUserForm()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: P }}>
              <Plus className="w-4 h-4" />Novo
            </button>
          </div>

          {showUserForm && (() => {
            const allCargos = getCargos();
            const cargoSelecionado = allCargos.find(c => c.roleType === uRole);
            const modNames: Record<string, string> = { dashboard: 'Visão Geral', agendamento: 'Agendamento', pacientes: 'Pacientes', equipe: 'Equipe', planos: 'Planos', cobrancas: 'Cobranças', financeiro: 'Financeiro', relatorios: 'Relatórios', configuracoes: 'Configurações', usuarios: 'Usuários', registroAtividades: 'Registro de Atividades' };
            return (
              <div className="rounded-xl p-4 mb-4 border" style={{ backgroundColor: isDark ? '#203650' : '#EDF5F7', borderColor: border }}>
                <p className="font-semibold text-sm mb-3" style={labelStyle}>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</p>
                {uError && <div className="text-xs p-2 rounded-lg mb-3" style={{ backgroundColor: 'rgba(217,92,92,0.12)', color: '#D95C5C' }}>{uError}</div>}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block mb-1 text-xs font-medium" style={labelStyle}>Nome</label>
                    <input value={uName} onChange={e => setUName(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inputStyle} placeholder="Nome completo" />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium" style={labelStyle}>E-mail</label>
                    <input value={uEmail} onChange={e => setUEmail(e.target.value)} type="email" className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inputStyle} placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium" style={labelStyle}>Cargo</label>
                    <select value={uRole} onChange={e => setURole(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inputStyle}>
                      <option value="recepcao">Recepção</option>
                      <option value="fisio">Fisioterapeuta</option>
                      <option value="admin">Administrador</option>
                      <option value="gerencia">Gerência</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium" style={labelStyle}>{editingUser ? 'Nova Senha (opcional)' : 'Senha'}</label>
                    <div className="relative">
                      <input value={uPwd} onChange={e => setUPwd(e.target.value)} type={showUPwd ? 'text' : 'password'} className="w-full pl-3 pr-8 py-2 rounded-xl border text-sm focus:outline-none" style={inputStyle} placeholder="••••••" />
                      <button type="button" onClick={() => setShowUPwd(!showUPwd)} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: textSub }}>
                        {showUPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {uPwd && <PasswordStrengthIndicator password={uPwd} isDark={isDark} />}
                  </div>
                </div>
                {/* Preview de permissões do cargo selecionado */}
                {cargoSelecionado && (
                  <div className="mb-3 p-3 rounded-xl border" style={{ borderColor: `${P}30`, backgroundColor: `${P}08` }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Info className="w-3.5 h-3.5" style={{ color: P }} />
                      <p className="text-xs font-semibold" style={{ color: P }}>Acesso do cargo "{cargoSelecionado.nome}"</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(cargoSelecionado.permissoes)
                        .filter(([, v]) => v.visualizar)
                        .map(([key]) => (
                          <span key={key} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${P}15`, color: P }}>{modNames[key] || key}</span>
                        ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={saveUser} className="px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: P }}>Salvar</button>
                  <button onClick={() => setShowUserForm(false)} className="px-4 py-2 rounded-xl text-sm border font-medium" style={{ borderColor: border, color: textSub }}>Cancelar</button>
                </div>
              </div>
            );
          })()}

          <div className="space-y-2">
            {users.map((u, i) => {
              const ativo = u.ativo !== false;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: isDark ? '#203650' : '#F3F7F9', borderColor: border, opacity: ativo ? 1 : 0.6 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: P }}>
                    <span className="text-white text-xs font-bold">{u.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={labelStyle}>{u.name}</p>
                    <p className="text-xs truncate" style={subStyle}>{u.email} · {ROLE_LABELS[u.role] || u.role}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: ativo ? 'rgba(53,169,120,0.12)' : 'rgba(217,92,92,0.1)', color: ativo ? '#35A978' : '#D95C5C' }}>
                    {ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openUserForm(u)} className="p-1.5 rounded-lg transition-all" style={{ color: textSub }} onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#31455F' : '#EDF5F7'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleUserStatus(u.email)} className="p-1.5 rounded-lg transition-all" style={{ color: ativo ? '#E5A83B' : '#35A978' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#31455F' : '#EDF5F7'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} title={ativo ? 'Desativar' : 'Ativar'}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    {u.email !== 'lhrdlsantetti@minha.fag.edu.br' && (
                      <button onClick={() => deleteUser(u.email)} className="p-1.5 rounded-lg transition-all" style={{ color: '#D95C5C' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(217,92,92,0.08)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

      case 'permissoes': return (
        <div className="h-full" style={{ minHeight: '400px' }}>
          <CargosPermissoesTab
            isDark={isDark}
            userRole={userRole}
            isGerencia={userRole === 'gerencia'}
          />
        </div>
      );

      case 'seguranca': return (
        <div className="space-y-5">
          <p className="font-semibold" style={labelStyle}>Alterar Senha</p>
          {pwdMsg && (
            <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: pwdMsg.startsWith('✓') ? 'rgba(53,169,120,0.1)' : 'rgba(217,92,92,0.1)', color: pwdMsg.startsWith('✓') ? '#35A978' : '#D95C5C', border: `1px solid ${pwdMsg.startsWith('✓') ? 'rgba(53,169,120,0.2)' : 'rgba(217,92,92,0.2)'}` }}>
              {pwdMsg}
            </div>
          )}
          {[
            { label: 'Senha Atual', val: curPwd, set: setCurPwd, show: showCur, setShow: setShowCur },
            { label: 'Nova Senha', val: newPwd, set: setNewPwd, show: showNew, setShow: setShowNew },
            { label: 'Confirmar Nova Senha', val: confPwd, set: setConfPwd, show: showNew, setShow: setShowNew },
          ].map(({ label, val, set, show, setShow }) => (
            <div key={label}>
              <label className="block mb-1 text-sm font-medium" style={labelStyle}>{label}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textSub }} />
                <input type={show ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)} className="w-full pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none" style={inputStyle} placeholder="••••••••" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: textSub }}>
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {newPwd && <PasswordStrengthIndicator password={newPwd} isDark={isDark} />}
          <button onClick={changePassword} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: P }}>Alterar Senha</button>
        </div>
      );

      case 'idioma': return (
        <div className="space-y-4">
          <p className="text-sm" style={subStyle}>Escolha o idioma da interface.</p>
          {[
            { id: 'pt', label: 'Português', flag: '🇧🇷', desc: 'Português do Brasil' },
            { id: 'en', label: 'English', flag: '🇺🇸', desc: 'English (United States)' },
            { id: 'es', label: 'Español', flag: '🇪🇸', desc: 'Español (España)' },
          ].map(lang => (
            <button key={lang.id} onClick={() => { const next = lang.id as Language; setIdioma(next); setLanguage(next); const current = authService.getCurrentUser(); if (current) authService.savePreferences(current.email, { ...authService.getPreferences(current.email), language: next }); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left" style={{ borderColor: idioma === lang.id ? P : border, backgroundColor: idioma === lang.id ? `${P}10` : isDark ? '#203650' : '#F3F7F9' }}>
              <span style={{ fontSize: '1.5rem' }}>{lang.flag}</span>
              <div>
                <p className="font-semibold text-sm" style={labelStyle}>{lang.label}</p>
                <p className="text-xs" style={subStyle}>{lang.desc}</p>
              </div>
              {idioma === lang.id && <Check className="w-4 h-4 ml-auto" style={{ color: P }} />}
            </button>
          ))}
          <button onClick={saveIdioma} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: P }}>Salvar Idioma</button>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="pm-panel-overlay config-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
      <div className="pm-panel config-modal-dialog relative w-full rounded-2xl shadow-2xl overflow-hidden flex" style={{ backgroundColor: bg, border: `1px solid ${border}`, maxHeight: '90vh', maxWidth: activeTab === 'permissoes' ? '900px' : '720px', transition: 'max-width 0.2s ease' }} role="dialog" aria-modal="true">
        <button onClick={onClose} className="config-modal-close absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg transition-all" style={{ color: textSub, backgroundColor: inputBg }} aria-label="Fechar configurações" title="Fechar">
          <X className="h-5 w-5" />
        </button>
        {/* Sidebar tabs */}
        <div className="config-modal-sidebar w-52 flex-shrink-0 flex flex-col" style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${border}` }}>
          <div className="px-4 py-5" style={{ borderBottom: `1px solid ${border}` }}>
            <p className="font-bold text-sm" style={{ color: textMain }}>Configurações</p>
          </div>
          <nav className="config-modal-desktop-nav flex-1 py-2 px-2 overflow-y-auto">
            {visibleTabs.map(t => {
              const Ic = t.icon;
              const active = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-sm text-left transition-all" style={{ backgroundColor: active ? `${P}18` : 'transparent', color: active ? P : textSub, fontWeight: active ? 600 : 400 }} onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = isDark ? 'rgba(55,182,158,0.06)' : 'rgba(3,140,140,0.06)'; }} onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  <Ic className="w-4 h-4 flex-shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </nav>
          <div className="config-modal-mobile-nav hidden px-3 pb-3">
            <label className="block text-xs font-semibold mb-1" style={{ color: textSub }} htmlFor="config-mobile-tab">Seção</label>
            <select id="config-mobile-tab" value={activeTab} onChange={event => setActiveTab(event.target.value)} className="w-full rounded-xl border px-3 py-2.5 font-semibold outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }}>
              {visibleTabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="config-modal-content flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="config-modal-section-header flex items-center justify-between px-6 py-4 pr-16 flex-shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
            <p className="font-semibold" style={{ color: textMain }}>{visibleTabs.find(t => t.id === activeTab)?.label}</p>
          </div>
          <div className={`config-modal-scroll flex-1 min-w-0 overflow-x-hidden ${activeTab === 'permissoes' ? 'flex flex-col overflow-y-auto' : 'overflow-y-auto'}`}>
            {activeTab === 'permissoes' ? renderTab() : <div className="config-modal-tab-body min-w-0 p-6">{renderTab()}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
