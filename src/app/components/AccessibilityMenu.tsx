import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  BellRing,
  Captions,
  ChevronDown,
  CircleSlash,
  Eye,
  Glasses,
  Keyboard,
  Moon,
  MousePointerClick,
  Pause,
  ScanEye,
  Sun,
  Type,
  Volume2,
} from 'lucide-react';

function UniversalAccessIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="30" fill="currentColor" />
      <circle cx="32" cy="32" r="25" stroke="white" strokeWidth="3.2" />
      <circle cx="32" cy="18" r="5.2" fill="white" />
      <path
        d="M15 27.5C24.8 31.1 39.2 31.1 49 27.5"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M32 27.5V39M32 39L24.8 53M32 39L39.2 53"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ColorBlindType =
  | 'off'
  | 'protanopia'
  | 'protanomaly'
  | 'deuteranopia'
  | 'deuteranomaly'
  | 'tritanopia'
  | 'tritanomaly'
  | 'achromatopsia'
  | 'blueConeMonochromacy'
  | 'anomalousTrichromacy'
  | 'acquired';

type AccessibilitySettings = {
  version: number;
  highContrast: boolean;
  colorBlindType: ColorBlindType;
  screenReaderMode: boolean;
  captionsLibras: boolean;
  soundVisualAlerts: boolean;
  keyboardNavigation: boolean;
  largeControls: boolean;
  largeControlsScale: number;
  reducedMotion: boolean;
  readingMode: boolean;
};

type AccessibilityMenuProps = {
  isDark: boolean;
  onToggleTheme: () => void;
  buttonStyle?: CSSProperties;
  buttonClassName?: string;
};

const STORAGE_KEY = 'pilamanager:accessibility-settings';
const SETTINGS_VERSION = 5;
let sharedAudioContext: AudioContext | null = null;
let lastSoundAt = 0;

const DEFAULT_SETTINGS: AccessibilitySettings = {
  version: SETTINGS_VERSION,
  highContrast: false,
  colorBlindType: 'off',
  screenReaderMode: false,
  captionsLibras: false,
  soundVisualAlerts: false,
  keyboardNavigation: false,
  largeControls: false,
  largeControlsScale: 1.35,
  reducedMotion: false,
  readingMode: false,
};

function loadSettings(): AccessibilitySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored);
    if (parsed.version !== SETTINGS_VERSION) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applySettings(settings: AccessibilitySettings) {
  const root = document.documentElement;
  root.classList.toggle('pm-a11y-high-contrast', settings.highContrast);
  root.classList.toggle('pm-a11y-color-blind', settings.colorBlindType !== 'off');
  root.classList.toggle('pm-a11y-protanopia', settings.colorBlindType === 'protanopia');
  root.classList.toggle('pm-a11y-protanomaly', settings.colorBlindType === 'protanomaly');
  root.classList.toggle('pm-a11y-deuteranopia', settings.colorBlindType === 'deuteranopia');
  root.classList.toggle('pm-a11y-deuteranomaly', settings.colorBlindType === 'deuteranomaly');
  root.classList.toggle('pm-a11y-tritanopia', settings.colorBlindType === 'tritanopia');
  root.classList.toggle('pm-a11y-tritanomaly', settings.colorBlindType === 'tritanomaly');
  root.classList.toggle('pm-a11y-achromatopsia', settings.colorBlindType === 'achromatopsia');
  root.classList.toggle('pm-a11y-blue-cone-monochromacy', settings.colorBlindType === 'blueConeMonochromacy');
  root.classList.toggle('pm-a11y-anomalous-trichromacy', settings.colorBlindType === 'anomalousTrichromacy');
  root.classList.toggle('pm-a11y-acquired-color-blindness', settings.colorBlindType === 'acquired');
  root.classList.toggle('pm-a11y-screen-reader', settings.screenReaderMode);
  root.classList.toggle('pm-a11y-captions-libras', settings.captionsLibras);
  root.classList.toggle('pm-a11y-sound-visual-alerts', settings.soundVisualAlerts);
  root.classList.toggle('pm-a11y-keyboard-navigation', settings.keyboardNavigation);
  root.classList.toggle('pm-a11y-large-controls', settings.largeControls);
  root.classList.toggle('pm-a11y-reduced-motion', settings.reducedMotion);
  root.classList.toggle('pm-a11y-reading-mode', settings.readingMode);
  root.style.setProperty('--pm-a11y-control-scale', String(settings.largeControlsScale));
}

function playActivationSound(frequency = 720) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const now = Date.now();
    if (now - lastSoundAt < 70) return;
    lastSoundAt = now;
    const ctx = sharedAudioContext || new AudioCtx();
    sharedAudioContext = ctx;
    if (ctx.state === 'suspended') void ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
  } catch {
    // Som auxiliar; se o navegador bloquear, o alerta visual continua funcionando.
  }
}

function getElementLabel(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return '';
  const element = target.closest('button, a, input, select, textarea, [role="button"], [aria-label], [title]') as HTMLElement | null;
  const source = element || target;
  const label = source.getAttribute('aria-label')
    || source.getAttribute('title')
    || source.getAttribute('placeholder')
    || source.innerText
    || source.textContent
    || source.tagName.toLowerCase();
  return label.replace(/\s+/g, ' ').trim().slice(0, 140);
}

function getInteractiveElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [aria-label], [title]') as HTMLElement | null;
}

function getActionSound(target: EventTarget | null) {
  const element = getInteractiveElement(target);
  if (!element) return null;
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role') || '';
  const type = element.getAttribute('type') || '';
  const label = getElementLabel(element) || 'funcionalidade';
  const isPrimaryAction = tag === 'button' || tag === 'a' || role === 'button' || role === 'menuitem';
  const isField = ['input', 'select', 'textarea'].includes(tag);
  const frequency = isPrimaryAction ? 760 : isField ? 620 : type === 'range' ? 540 : 680;
  return { label, frequency };
}

function isVisibleElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden' && styles.display !== 'none';
}

function getTopNavigationScope() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="dialog"], [aria-modal="true"], .fixed.inset-0, [class*="fixed"][class*="inset-0"]'
  )).filter(element => {
    if (!isVisibleElement(element)) return false;
    if (element.querySelector('.pm-a11y-alert-indicator, .pm-a11y-caption-indicator, .pm-a11y-keyboard-indicator')) return false;
    const styles = window.getComputedStyle(element);
    const zIndex = Number.parseInt(styles.zIndex || '0', 10);
    return styles.position === 'fixed' && (Number.isFinite(zIndex) ? zIndex >= 40 : true);
  });

  const scoped = candidates
    .map(element => {
      const styles = window.getComputedStyle(element);
      const zIndex = Number.parseInt(styles.zIndex || '0', 10);
      return { element, zIndex: Number.isFinite(zIndex) ? zIndex : 0 };
    })
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.element;

  return scoped || document.body;
}

function getFocusableElements(scope = getTopNavigationScope()) {
  return Array.from(scope.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"]:not([aria-disabled="true"])'
  )).filter(isVisibleElement);
}

function moveKeyboardFocus(direction: 1 | -1) {
  const scope = getTopNavigationScope();
  const focusables = getFocusableElements(scope);
  if (focusables.length === 0) return null;
  const active = document.activeElement as HTMLElement | null;
  const activeIndex = active && scope.contains(active) ? focusables.indexOf(active) : -1;
  const fallbackIndex = direction > 0 ? 0 : focusables.length - 1;
  const nextIndex = activeIndex >= 0 ? (activeIndex + direction + focusables.length) % focusables.length : fallbackIndex;
  const next = focusables[nextIndex];
  next.focus();
  next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return next;
}

export function AccessibilityMenu({ isDark, onToggleTheme, buttonStyle, buttonClassName = 'p-2 rounded-lg transition-all' }: AccessibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const [showColorBlindOptions, setShowColorBlindOptions] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(() => loadSettings());
  const [announcement, setAnnouncement] = useState('Menu de acessibilidade pronto.');
  const [helperText, setHelperText] = useState('Passe o mouse ou use Tab para eu descrever o item selecionado.');
  const [visualAlert, setVisualAlert] = useState('Alertas sonoros e visuais ativos.');
  const [alertPulse, setAlertPulse] = useState(0);

  useEffect(() => {
    applySettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!settings.keyboardNavigation) return;
      if (event.key === 'Escape') setOpen(false);
      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setOpen(value => !value);
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        const next = moveKeyboardFocus(event.shiftKey ? -1 : 1);
        if (next) setHelperText(getElementLabel(next) || 'Item selecionado.');
      }
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
        const next = moveKeyboardFocus(direction);
        if (next) setHelperText(getElementLabel(next) || 'Item selecionado.');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settings.keyboardNavigation]);

  useEffect(() => {
    if (!settings.screenReaderMode && !settings.captionsLibras && !settings.soundVisualAlerts) return;

    const updateHelper = (event: Event) => {
      const label = getElementLabel(event.target);
      if (!label) return;
      if (settings.screenReaderMode || settings.captionsLibras) setHelperText(label);
    };

    const playFeedback = (event: Event) => {
      const action = getActionSound(event.target);
      if (!action) return;
      playActivationSound(action.frequency);
      setVisualAlert(`Acao: ${action.label}`);
      setAlertPulse(value => value + 1);
    };

    const onClick = (event: MouseEvent) => {
      const label = getElementLabel(event.target);
      if (!label) return;
      if (settings.soundVisualAlerts) playFeedback(event);
      if (settings.captionsLibras || settings.screenReaderMode) setHelperText(`Selecionado: ${label}`);
    };

    const onKeySound = (event: KeyboardEvent) => {
      if (!settings.soundVisualAlerts) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      playFeedback(event);
    };

    const onChangeSound = (event: Event) => {
      if (!settings.soundVisualAlerts) return;
      playFeedback(event);
    };

    document.addEventListener('mouseover', updateHelper, true);
    document.addEventListener('focusin', updateHelper, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('change', onChangeSound, true);
    document.addEventListener('keydown', onKeySound, true);
    return () => {
      document.removeEventListener('mouseover', updateHelper, true);
      document.removeEventListener('focusin', updateHelper, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('change', onChangeSound, true);
      document.removeEventListener('keydown', onKeySound, true);
    };
  }, [settings.screenReaderMode, settings.captionsLibras, settings.soundVisualAlerts]);

  const colors = useMemo(() => ({
    P: isDark ? '#67C8CE' : '#087F8C',
    card: isDark ? '#182B43' : '#FFFFFF',
    muted: isDark ? '#203650' : '#F3F7F9',
    hover: isDark ? '#203650' : '#EDF5F7',
    border: isDark ? '#31455F' : '#DCE6EC',
    textMain: isDark ? '#EDF4FC' : '#1A3047',
    textSub: isDark ? '#AFBFD3' : '#62758A',
  }), [isDark]);

  const update = <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K], label: string) => {
    setSettings(current => ({ ...current, [key]: value }));
    const stateText = value ? 'ativado' : 'desativado';
    setAnnouncement(`${label} ${stateText}.`);
    if (key === 'soundVisualAlerts' && value) playActivationSound();
  };

  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    setAnnouncement('Todas as opções de acessibilidade foram desativadas. O sistema voltou ao padrão.');
  };

  const toggleItems = [
    { key: 'highContrast', label: 'Contraste forte', desc: 'Aumenta o contraste para baixa visão.', icon: Eye },
    { key: 'screenReaderMode', label: 'Leitor ao passar o mouse', desc: 'Mostra a descrição do item em foco ou sob o mouse.', icon: ScanEye },
    { key: 'captionsLibras', label: 'Libras e legendas', desc: 'Abre um painel textual para avisos e ações.', icon: Captions },
    { key: 'soundVisualAlerts', label: 'Som e alerta visual', desc: 'Emite um som e mostra um aviso em cada ação.', icon: BellRing },
    { key: 'keyboardNavigation', label: 'Teclado sem mouse', desc: 'As setas navegam entre botões e campos.', icon: Keyboard },
    { key: 'largeControls', label: 'Botões maiores', desc: 'Aumenta os controles pela barra abaixo.', icon: MousePointerClick },
    { key: 'reducedMotion', label: 'Sem animações ou zoom', desc: 'Remove transições, zoom e movimentos.', icon: Pause },
    { key: 'readingMode', label: 'Modo de leitura simples', desc: 'Deixa o texto mais limpo, forte e espaçado.', icon: Type },
  ] as const;

  const activeCount = toggleItems.filter(item => Boolean(settings[item.key])).length + (settings.colorBlindType !== 'off' ? 1 : 0);
  const colorBlindOptions: Array<{ id: ColorBlindType; label: string; desc: string }> = [
    { id: 'off', label: 'Desligado', desc: 'Sem ajuste de daltonismo.' },
    { id: 'protanopia', label: 'Protanopia', desc: 'Deficiência forte do vermelho.' },
    { id: 'protanomaly', label: 'Protanomalia', desc: 'Vermelho com pouco brilho.' },
    { id: 'deuteranopia', label: 'Deuteranopia', desc: 'Deficiência forte do verde.' },
    { id: 'deuteranomaly', label: 'Deuteranomalia', desc: 'Verde fica mais avermelhado.' },
    { id: 'tritanopia', label: 'Tritanopia', desc: 'Azul e amarelo ficam confundidos.' },
    { id: 'tritanomaly', label: 'Tritanomalia', desc: 'Alteração leve em azul/amarelo.' },
    { id: 'achromatopsia', label: 'Acromatopsia', desc: 'Apenas preto, branco e cinza.' },
    { id: 'blueConeMonochromacy', label: 'Cone azul', desc: 'Cores muito limitadas.' },
    { id: 'anomalousTrichromacy', label: 'Tricromatismo leve', desc: 'Contraste de cores menos preciso.' },
    { id: 'acquired', label: 'Adquirido', desc: 'Perda de cores por idade ou doença.' },
  ];

  return (
    <div className="relative">
      <svg className="sr-only" aria-hidden="true" focusable="false">
        <defs>
          <filter id="pm-protanopia-filter">
            <feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0" />
          </filter>
          <filter id="pm-deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0" />
          </filter>
          <filter id="pm-tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0" />
          </filter>
          <filter id="pm-blue-cone-filter">
            <feColorMatrix type="matrix" values="0.2 0.25 0.55 0 0 0.15 0.2 0.65 0 0 0.05 0.25 0.7 0 0 0 0 0 1 0" />
          </filter>
        </defs>
      </svg>

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={buttonClassName}
        style={buttonStyle || { color: colors.textSub }}
        aria-label="Acessibilidade"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Acessibilidade"
      >
        <UniversalAccessIcon className="w-4 h-4" />
        {activeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full" style={{ backgroundColor: colors.P }} />
        )}
      </button>

      <div className="sr-only" aria-live="polite">{announcement}</div>

      {settings.soundVisualAlerts && (
        <div key={alertPulse} className="pm-a11y-alert-indicator" role="status" aria-live="polite">
          <Volume2 className="h-3.5 w-3.5" />
          {visualAlert}
        </div>
      )}

      {(settings.captionsLibras || settings.screenReaderMode) && (
        <div className="pm-a11y-caption-indicator" role="status" aria-live="polite">
          {settings.captionsLibras ? <Glasses className="h-3.5 w-3.5" /> : <ScanEye className="h-3.5 w-3.5" />}
          {settings.captionsLibras ? `Legenda/Libras: ${helperText}` : `Leitor visual: ${helperText}`}
        </div>
      )}

      {settings.keyboardNavigation && (
        <div className="pm-a11y-keyboard-indicator" role="status">
          Tab navega, Enter seleciona, Esc fecha, Alt+A abre acessibilidade.
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="accessibility-menu-panel absolute right-0 top-full z-50 mt-2 w-[340px] rounded-xl p-3 shadow-xl"
            role="dialog"
            aria-label="Configurações de acessibilidade"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold" style={{ color: colors.textMain, fontSize: '0.92rem' }}>Acessibilidade</p>
                <p className="text-xs" style={{ color: colors.textSub }}>Escolha recursos para visão, audição, fala, teclado e movimento.</p>
              </div>
              <button type="button" onClick={reset} className="rounded-lg px-2 py-1 text-xs" style={{ color: colors.P, backgroundColor: colors.muted }}>
                Padrão
              </button>
            </div>

            <div className="space-y-1">
              <div className="rounded-xl p-2" style={{ backgroundColor: settings.colorBlindType !== 'off' ? `${colors.P}18` : colors.muted }}>
                <button
                  type="button"
                  onClick={() => setShowColorBlindOptions(value => !value)}
                  className="flex w-full items-center gap-2 rounded-lg p-1 text-left"
                  aria-expanded={showColorBlindOptions}
                >
                  <CircleSlash className="h-4 w-4" style={{ color: colors.P }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold" style={{ color: colors.textMain }}>Daltonismo</span>
                    <span className="block text-xs" style={{ color: colors.textSub }}>
                      {settings.colorBlindType === 'off'
                        ? 'Clique para escolher um tipo.'
                        : colorBlindOptions.find(item => item.id === settings.colorBlindType)?.label}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform" style={{ color: colors.textSub, transform: showColorBlindOptions ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>

                {showColorBlindOptions && (
                  <div className="mt-2 grid grid-cols-1 gap-1">
                    {colorBlindOptions.map(item => {
                      const active = settings.colorBlindType === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => update('colorBlindType', item.id, `Daltonismo ${item.label}`)}
                          className="rounded-lg px-2 py-1.5 text-left text-xs transition-all"
                          style={{ backgroundColor: active ? colors.P : 'transparent', color: active ? '#FFFFFF' : colors.textSub, border: `1px solid ${active ? colors.P : colors.border}` }}
                        >
                          <span className="block font-semibold">{item.label}</span>
                          <span className="block opacity-80">{item.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  onToggleTheme();
                  setAnnouncement(`Tema ${isDark ? 'claro' : 'escuro'} ativado.`);
                }}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.hover; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                aria-pressed={isDark}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: colors.muted, color: colors.P }}>
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold" style={{ color: colors.textMain }}>Tema claro/escuro</span>
                  <span className="block text-xs" style={{ color: colors.textSub }}>{isDark ? 'Clique para usar tema claro.' : 'Clique para usar tema escuro.'}</span>
                </span>
                <span className="text-xs font-semibold" style={{ color: colors.P }}>{isDark ? 'Escuro' : 'Claro'}</span>
              </button>

              {toggleItems.map(item => {
                const Icon = item.icon;
                const checked = Boolean(settings[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => update(item.key, !checked, item.label)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all"
                    style={{ backgroundColor: checked ? `${colors.P}18` : 'transparent' }}
                    onMouseEnter={e => { if (!checked) e.currentTarget.style.backgroundColor = colors.hover; }}
                    onMouseLeave={e => { if (!checked) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    aria-pressed={checked}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: checked ? colors.P : colors.muted, color: checked ? '#FFFFFF' : colors.P }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold" style={{ color: colors.textMain }}>{item.label}</span>
                      <span className="block text-xs" style={{ color: colors.textSub }}>{item.desc}</span>
                    </span>
                    <span
                      className="flex h-5 w-9 items-center rounded-full p-0.5 transition-all"
                      style={{ backgroundColor: checked ? colors.P : colors.border }}
                      aria-hidden="true"
                    >
                      <span className="h-4 w-4 rounded-full bg-white transition-all" style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
                    </span>
                  </button>
                );
              })}
            </div>

            {settings.largeControls && (
              <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: colors.muted }}>
                <label className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold" style={{ color: colors.textMain }}>
                  Intensidade dos botões
                  <span style={{ color: colors.P }}>{Math.round(settings.largeControlsScale * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="1.8"
                  step="0.05"
                  value={settings.largeControlsScale}
                  onInput={event => update('largeControlsScale', Number(event.currentTarget.value), 'Intensidade dos botões')}
                  onChange={event => update('largeControlsScale', Number(event.target.value), 'Intensidade dos botões')}
                  className="w-full"
                  style={{ accentColor: colors.P }}
                />
              </div>
            )}

            <div className="mt-3 flex items-start gap-2 rounded-xl p-2" style={{ backgroundColor: colors.muted }}>
              <Keyboard className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: colors.P }} />
              <p className="text-xs" style={{ color: colors.textSub }}>Cada opção liga ou desliga ao clicar. O botão Padrão remove tudo.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
