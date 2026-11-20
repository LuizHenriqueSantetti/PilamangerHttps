import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Users, Calendar, BarChart3, Activity, ChevronRight, Dumbbell } from 'lucide-react';
import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { Dashboard } from './components/Dashboard';
import {BrandPanel} from './components/BrandPanel';
import { AccessibilityMenu } from './components/AccessibilityMenu';
import { NotificationCenter } from './components/NotificationCenter';
import { PasswordStrengthIndicator } from './components/PasswordStrengthIndicator';
import { authService } from './services/authService';
import { UserData } from './types/auth';
import { createThemeTransition } from './utils/themeTransition';
import { notify, performAction } from './utils/notifications';
import { validateEmail } from './utils/validators';
import { evaluatePasswordStrength } from './utils/security';
import { PRIVACY_CONSENT_TEXT, PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_TITLE } from './utils/privacy';
import { clearRemoteStorageCache, installRemoteStorageSync, flushRemoteStorage } from './services/remoteStorageSync';
import { installAlertBridge } from './utils/notifications';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [firstAccessPrivacyAccepted, setFirstAccessPrivacyAccepted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [loginError, setLoginError] = useState('');
  const [showSavedAccounts, setShowSavedAccounts] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<UserData[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const themeTransition = useRef<ReturnType<typeof createThemeTransition> | null>(null);

  useEffect(() => {
    document.documentElement.dataset.pmTheme = isDark ? 'dark' : 'light';
    if (currentUser) authService.savePreferences(currentUser.email, { isDark });
  }, [isDark]);

  const handleToggleTheme = () => {
    themeTransition.current ??= createThemeTransition(document.documentElement, dark => flushSync(() => setIsDark(dark)));
    const reduced = themeTransition.current.change();
    notify(reduced ? 'Aparência atualizada. A animação está desativada nas preferências de movimento.' : 'Preferência de aparência atualizada neste dispositivo.', 'info');
  };

  useEffect(() => () => { themeTransition.current?.dispose(); }, []);

  useEffect(() => {
    installAlertBridge();
    authService.initialize().then(async users => {
      const current = authService.getCurrentUser();
      if (!current) { setAuthChecked(true); return; }
      const user = users.find(u => u.email === current.email);
      if (user) {
        if (!user.mustChangePassword) await installRemoteStorageSync();
        setCurrentUser(user); setIsDark(authService.getPreferences(user.email).isDark); setIsAuthenticated(true);
      } else await authService.logout();
      setAuthChecked(true);
    }).catch(() => { setLoginError('Não foi possível carregar os dados. Entre novamente para tentar.');setAuthChecked(true); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const emailError = validateEmail(email);
    if (emailError) { setLoginError(emailError); notify('Informe um e-mail válido.', 'warning'); return; }
    if (!password) { setLoginError('Informe a senha.'); notify('Informe a senha.', 'warning'); return; }
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const result = await authService.login(email, password, rememberMe);
    setIsLoggingIn(false);
    if (result.ok && result.user) {
      try { if (!result.user.mustChangePassword) await installRemoteStorageSync(); }
      catch { setLoginError('Não foi possível carregar os dados do servidor. Tente novamente.'); return; }
      setCurrentUser(result.user); setIsAuthenticated(true);
      setIsDark(authService.getPreferences(result.user.email).isDark);
      setEmail(''); setPassword('');
      notify('Login realizado com sucesso.', 'success');
    } else {
      const message = result.error || 'E-mail ou senha incorretos. Verifique suas credenciais.';
      setLoginError(message); notify(message, 'error');
    }
  };

  const handleAcceptFirstAccessPrivacy = async () => {
    if (!currentUser || !firstAccessPrivacyAccepted) return;
    await performAction('privacy', async () => {
      const updated = await authService.acceptPrivacyPolicy(currentUser.email); setCurrentUser(updated);
    }, 'Política de Privacidade aceita.');
  };

  const handleLogout = async () => {
    try { await flushRemoteStorage(); } catch { notify('Há alterações não salvas. Tente novamente no indicador do cabeçalho antes de sair.', 'error'); return; }
    if (!await performAction('logout', () => authService.logout(), 'Sessão encerrada.')) return;
    setIsAuthenticated(false);
    setCurrentUser(null);
    clearRemoteStorageCache();
    notify('Sessão encerrada.', 'success');
  };

  if (!authChecked) {
    return <main className="min-h-screen bg-[#f6fbfa] text-[#073b3a] flex items-center justify-center" aria-busy="true"><div className="text-center"><p className="text-xl font-semibold">PilaManager</p><p className="text-sm opacity-75">Verificando sessão segura...</p></div></main>;
  }

  if (isAuthenticated && currentUser) {
    const mustAcceptPrivacy = !currentUser.privacyAcceptedAt;
    return (
      <>
        {!currentUser.mustChangePassword && <Dashboard isDark={isDark} userEmail={currentUser.email} userName={currentUser.name} userRole={currentUser.role} onLogout={handleLogout} onToggleTheme={handleToggleTheme} />}
        {currentUser.mustChangePassword && <RequiredPasswordChange isDark={isDark} user={currentUser} onChanged={async updated => { await installRemoteStorageSync(); setCurrentUser(updated); }} onLogout={handleLogout} />}
        {!currentUser.mustChangePassword && mustAcceptPrivacy && (
          <PrivacyPolicyModal
            isDark={isDark}
            requireAcceptance
            accepted={firstAccessPrivacyAccepted}
            onAcceptedChange={setFirstAccessPrivacyAccepted}
            onConfirm={handleAcceptFirstAccessPrivacy}
          />
        )}
        <NotificationCenter />
      </>
    );
  }

  const P = isDark ? '#67C8CE' : '#087F8C';
  const PH = isDark ? '#8DD4D0' : '#076A76';
  const bg = isDark ? '#0B1426' : '#F3F7F9';
  const cardBg = isDark ? '#182B43' : '#FFFFFF';
  const inputBg = isDark ? '#203650' : '#F7FAFC';
  const border = isDark ? '#31455F' : '#DCE6EC';
  const textMain = isDark ? '#EDF4FC' : '#1A3047';
  const textSub = isDark ? '#AFBFD3' : '#62758A';

  return (
    <div className="pm-login" style={{ backgroundColor: bg }}>
      <BrandPanel/>

      {/* Right panel */}
      <div className="pm-login-panel">
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <AccessibilityMenu
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
            buttonClassName="relative p-2.5 rounded-xl transition-all"
            buttonStyle={{ backgroundColor: cardBg, color: P, border: `1px solid ${border}` }}
          />
        </div>

        <div className="w-full max-w-[430px]">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <p className="font-bold" style={{ color: P, fontSize: '1.05rem' }}>PilaManager 2.1</p>
          </div>

          <div className="rounded-2xl p-9 shadow-xl" style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}>
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <h1 style={{ color: P, fontSize: '1.4rem', fontWeight: 700 }}>Entrar</h1>
              </div>
              <p style={{ color: textSub, fontSize: '0.92rem' }}>Acesse com suas credenciais</p>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl mb-5" style={{ backgroundColor: 'rgba(217,92,92,0.1)', color: '#D95C5C', border: '1px solid rgba(217,92,92,0.2)', fontSize: '0.92rem' }}>
                <span>âš </span><span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block mb-2 font-medium" style={{ color: textMain, fontSize: '0.92rem' }}>E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: P }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" className="w-full pl-11 pr-4 py-3 rounded-xl border transition-all focus:outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain, fontSize: '0.92rem' }} placeholder="seu@email.com" required />
                </div>
              </div>
              <div>
                <label className="block mb-2 font-medium" style={{ color: textMain, fontSize: '0.92rem' }}>Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: P }} />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="w-full pl-11 pr-11 py-3 rounded-xl border transition-all focus:outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain, fontSize: '0.92rem' }} placeholder="Digite sua senha" required />
                  <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: textSub }} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4.5 h-4.5 rounded" style={{ accentColor: P }} />
                  <span style={{ color: textSub, fontSize: '0.92rem' }}>Lembrar-me</span>
                </label>
                <button type="button" onClick={() => setShowForgotPassword(true)} style={{ color: P, fontSize: '0.92rem', fontWeight: 500 }}>Esqueceu a senha?</button>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: textSub }}>
                Ao acessar o sistema, consulte a{' '}
                <button type="button" onClick={() => setShowPrivacyPolicy(true)} className="font-semibold underline" style={{ color: P }}>
                  Política de Privacidade
                </button>
                .
              </p>
              <button type="submit" disabled={isLoggingIn} className="w-full py-3.5 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60" style={{ backgroundColor: P, fontSize: '0.97rem' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = PH)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = P)}>
                {isLoggingIn ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: border }} /></div>
              <div className="relative flex justify-center"><span className="px-3" style={{ backgroundColor: cardBg, color: textSub, fontSize: '0.92rem' }}>ou</span></div>
            </div>

            <button type="button" onClick={() => { setSavedAccounts(authService.listSavedLoginAccounts() as UserData[]); setShowSavedAccounts(true); }} className="w-full py-3 rounded-xl font-medium transition-all border mb-5" style={{ backgroundColor: 'transparent', borderColor: border, color: P, fontSize: '0.92rem' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? 'rgba(55,182,158,0.08)' : '#EDF5F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              Ver contas salvas
            </button>

            <p className="text-center" style={{ color: textSub, fontSize: '0.92rem' }}>Contas são criadas pela Gerência para proteger os dados da clínica.</p>
          </div>
        </div>
      </div>

      {/* Saved Accounts Modal */}
      {showSavedAccounts && (
        <PMModal onClose={() => setShowSavedAccounts(false)} cardBg={cardBg} border={border}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}><Users className="w-3.5 h-3.5 text-white" /></div>
            <div><p className="font-semibold" style={{ color: textMain }}>Contas Salvas</p><p className="text-xs" style={{ color: textSub }}>{savedAccounts.length} conta(s)</p></div>
          </div>
          {savedAccounts.length === 0 ? <p className="text-sm text-center py-4" style={{ color: textSub }}>Nenhuma conta encontrada.</p> : (
            <div className="space-y-2">
              {savedAccounts.map((acc, i) => (
                <button key={i} onClick={() => { setEmail(acc.email); setPassword(''); setShowSavedAccounts(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border" style={{ borderColor: border, backgroundColor: isDark ? '#203650' : '#F3F7F9' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#31455F' : '#EDF5F7')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = isDark ? '#203650' : '#F3F7F9')}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: P }}>
                    <span className="text-white text-xs font-bold">{acc.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div><p className="text-sm font-medium" style={{ color: textMain }}>{acc.name}</p><p className="text-xs" style={{ color: textSub }}>{acc.email}</p></div>
                  <ChevronRight className="w-4 h-4 ml-auto" style={{ color: textSub }} />
                </button>
              ))}
            </div>
          )}
        </PMModal>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <PMModal onClose={() => setShowForgotPassword(false)} cardBg={cardBg} border={border}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}><Lock className="w-3.5 h-3.5 text-white" /></div>
            <div><p className="font-semibold" style={{ color: textMain }}>Recuperar acesso</p><p className="text-xs" style={{ color: textSub }}>Redefinição segura de senha</p></div>
          </div>
          <p className="text-sm leading-relaxed mb-5" style={{ color: textSub }}>
            Solicite à Gerência da clínica a redefinição da sua senha. Por segurança, o PilaManager não confirma se um e-mail possui cadastro e não envia links sem um serviço de e-mail configurado.
          </p>
          <button type="button" onClick={() => setShowForgotPassword(false)} className="w-full py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90" style={{ backgroundColor: P }}>Entendi</button>
        </PMModal>
      )}
      {showPrivacyPolicy && <PrivacyPolicyModal isDark={isDark} onClose={() => setShowPrivacyPolicy(false)} />}
      <NotificationCenter />
    </div>
  );
}

function RequiredPasswordChange({ isDark, user, onChanged, onLogout }: { isDark: boolean; user: UserData; onChanged: (user: UserData) => unknown; onLogout: () => unknown }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const primary = isDark ? '#67C8CE' : '#087F8C';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const text = isDark ? '#EDF4FC' : '#1A3047';
  const muted = isDark ? '#AFBFD3' : '#62758A';
  const border = isDark ? '#31455F' : '#DCE6EC';
  const input = isDark ? '#203650' : '#F7FAFC';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!evaluatePasswordStrength(newPassword).isStrong) { setError('Use uma senha forte com maiúscula, minúscula, número e símbolo.'); return; }
    if (newPassword !== confirmPassword) { setError('As novas senhas não coincidem.'); return; }
    setSaving(true);
    const changed = await performAction('password', () => authService.updatePassword(user.email, currentPassword, newPassword), 'Senha alterada.');
    setSaving(false);
    if (!changed) return;
    await onChanged({ ...user, mustChangePassword: false });
  };

  return <main className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9' }}>
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl border p-8 shadow-xl" style={{ backgroundColor: card, borderColor: border }}>
      <h1 className="text-xl font-bold" style={{ color: text }}>Proteja sua conta</h1>
      <p className="mt-2 text-sm" style={{ color: muted }}>Troque a senha temporária antes de acessar os dados internos.</p>
      {error && <p className="mt-4 rounded-xl border p-3 text-sm text-red-600" style={{ borderColor: border }}>{error}</p>}
      <label className="mt-4 block text-sm font-medium" style={{ color: text }}>Senha temporária<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required className="mt-1 w-full rounded-xl border px-4 py-3 outline-none" style={{ backgroundColor: input, borderColor: border, color: text }} /></label>
      <label className="mt-4 block text-sm font-medium" style={{ color: text }}>Nova senha<input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" required className="mt-1 w-full rounded-xl border px-4 py-3 outline-none" style={{ backgroundColor: input, borderColor: border, color: text }} /></label>
      <label className="mt-4 block text-sm font-medium" style={{ color: text }}>Confirmar nova senha<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required className="mt-1 w-full rounded-xl border px-4 py-3 outline-none" style={{ backgroundColor: input, borderColor: border, color: text }} /></label>
      <PasswordStrengthIndicator password={newPassword} isDark={isDark} />
      <button type="submit" disabled={saving} className="mt-5 w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60" style={{ backgroundColor: primary }}>{saving ? 'Salvando...' : 'Alterar senha e continuar'}</button>
      <button type="button" onClick={() => onLogout()} className="mt-3 w-full py-2 text-sm font-medium" style={{ color: muted }}>Sair</button>
    </form>
  </main>;
}

function PMModal({ children, onClose, cardBg, border }: { children: React.ReactNode; onClose: () => void; cardBg: string; border: string }) {
  return (
    <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="pm-panel w-full max-w-md rounded-2xl p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto" style={{ backgroundColor: cardBg, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg" style={{ color: '#62758A', backgroundColor: 'rgba(0,0,0,0.05)' }} aria-label="Fechar">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {children}
      </div>
    </div>
  );
}

function PrivacyPolicyModal({ isDark, onClose, requireAcceptance = false, accepted = false, onAcceptedChange, onConfirm }: {
  isDark: boolean;
  onClose?: () => void;
  requireAcceptance?: boolean;
  accepted?: boolean;
  onAcceptedChange?: (accepted: boolean) => void;
  onConfirm?: () => void;
}) {
  const P = isDark ? '#67C8CE' : '#087F8C';
  const cardBg = isDark ? '#182B43' : '#FFFFFF';
  const border = isDark ? '#31455F' : '#DCE6EC';
  const inputBg = isDark ? '#203650' : '#F7FAFC';
  const textMain = isDark ? '#EDF4FC' : '#1A3047';
  const textSub = isDark ? '#AFBFD3' : '#62758A';

  return (
    <div className="pm-panel-overlay fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)' }}>
      <div className="pm-panel w-full max-w-2xl rounded-2xl p-7 shadow-2xl" style={{ backgroundColor: cardBg, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
        <div className="pm-panel-header flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: textMain }}>{PRIVACY_POLICY_TITLE}</h2>
            <p className="mt-1 text-sm" style={{ color: textSub }}>PilaManager 2.1</p>
          </div>
          {!requireAcceptance && (
            <button onClick={onClose} className="rounded-lg p-2" style={{ color: textSub }} aria-label="Fechar">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="mt-5 max-h-[52vh] space-y-4 overflow-y-auto rounded-xl border p-4" style={{ borderColor: border, backgroundColor: inputBg }}>
          {PRIVACY_POLICY_SECTIONS.map(section => (
            <section key={section.title}>
              <h3 className="text-sm font-bold uppercase" style={{ color: P }}>{section.title}</h3>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: textSub }}>{section.text}</p>
            </section>
          ))}
        </div>
        {requireAcceptance && (
          <label className="mt-5 flex items-start gap-2 rounded-xl border p-3 text-sm" style={{ borderColor: border, color: textSub, backgroundColor: inputBg }}>
            <input type="checkbox" checked={accepted} onChange={e => onAcceptedChange?.(e.target.checked)} className="mt-1 h-4 w-4 flex-shrink-0" style={{ accentColor: P }} />
            <span>{PRIVACY_CONSENT_TEXT}</span>
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          {!requireAcceptance && <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: P }}>Fechar</button>}
          {requireAcceptance && <button onClick={onConfirm} disabled={!accepted} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: P }}>Aceitar e continuar</button>}
        </div>
      </div>
    </div>
  );
}

