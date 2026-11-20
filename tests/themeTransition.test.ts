import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createThemeTransition, readThemeMotionPreference, saveThemeMotionPreference, THEME_TRANSITION_MS } from '../src/app/utils/themeTransition';

let osReduced = false;
beforeEach(() => {
  vi.useFakeTimers(); osReduced = false;
  Object.assign(window, { matchMedia: () => ({ matches: osReduced }) });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
function fixture() {
  const classes = new Set<string>();
  let reads = 0;
  const root = {
    ownerDocument: undefined as unknown as Document,
    dataset: { pmTheme: 'light' } as Record<string, string>,
    classList: { add: (s: string) => classes.add(s), remove: (s: string) => classes.delete(s), contains: (s: string) => classes.has(s) },
    get offsetWidth() { reads++; return 1280; },
  };
  const commit = vi.fn();
  const controller = createThemeTransition(root as unknown as HTMLElement, commit);
  return { root, classes, commit, controller, reads: () => reads };
}
describe('transição real de tema', () => {
  it('prepara cores anteriores antes de alterar o tema e limpa no fim', () => {
    const f = fixture();
    expect(f.controller.change()).toBe(false);
    expect(f.reads()).toBe(1); expect(f.classes.has('pm-theme-changing')).toBe(true);
    expect(f.root.dataset.pmTheme).toBe('dark'); expect(f.commit).toHaveBeenCalledWith(true);
    vi.advanceTimersByTime(THEME_TRANSITION_MS + 80);
    expect(f.classes.size).toBe(0); expect(f.root.dataset.pmThemeMotion).toBe('idle');
  });
  it('alterna nas duas direções inclusive com cliques rápidos', () => {
    const f = fixture(); f.controller.change(); vi.advanceTimersByTime(100); f.controller.change();
    expect(f.root.dataset.pmTheme).toBe('light');
    vi.advanceTimersByTime(400); expect(f.classes.size).toBe(1);
    vi.advanceTimersByTime(100); expect(f.classes.size).toBe(0);
  });
  it('respeita movimento reduzido automático do sistema', () => {
    osReduced = true; const f = fixture();
    expect(f.controller.change()).toBe(true);
    expect(f.root.dataset.pmThemeMotion).toBe('reduced'); expect(f.reads()).toBe(0);
    expect(f.commit).toHaveBeenCalledWith(true);
  });
  it('permite opção explícita de transição de cores sem alterar o sistema', () => {
    osReduced = true; saveThemeMotionPreference('smooth'); const f = fixture();
    expect(f.controller.change()).toBe(false); expect(f.classes.size).toBe(1);
    expect(osReduced).toBe(true);
  });
  it('prioriza Sem animações da acessibilidade mesmo com preferência suave', () => {
    saveThemeMotionPreference('smooth'); const f = fixture(); f.classes.add('pm-a11y-reduced-motion');
    expect(f.controller.change()).toBe(true); expect(f.reads()).toBe(0);
  });
  it('permite desligar somente a transição de tema', () => {
    saveThemeMotionPreference('off'); const f = fixture();
    expect(f.controller.change()).toBe(true); expect(f.reads()).toBe(0);
  });
  it('descarta preferência desconhecida e aceita escolher tema específico', () => {
    localStorage.setItem('preferences_themeMotion', 'invalid');
    expect(readThemeMotionPreference()).toBe('auto');
    const f = fixture(); f.controller.change(false); expect(f.root.dataset.pmTheme).toBe('light');
  });
  it('cancela limpeza pendente ao desmontar', () => {
    const f = fixture(); f.controller.change(); f.controller.dispose();
    expect(f.classes.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it('atualiza toda a paleta em uma única captura de página', async () => {
    const f = fixture(); let apply!: () => void; let finish!: () => void;
    const finished = new Promise<void>(resolve => { finish = resolve; });
    f.root.ownerDocument = { startViewTransition: (update: () => void) => {
      apply = update; return { ready: Promise.resolve(), finished, skipTransition: vi.fn() };
    } } as unknown as Document;
    f.controller.change();
    expect(f.commit).not.toHaveBeenCalled();
    expect(f.classes.has('pm-theme-snapshot')).toBe(true);
    expect(f.classes.has('pm-theme-changing')).toBe(false);
    expect(f.root.dataset.pmThemeMotion).toBe('snapshot');
    apply(); expect(f.commit).toHaveBeenCalledExactlyOnceWith(true);
    expect(f.root.dataset.pmTheme).toBe('dark');
    finish(); await Promise.resolve(); expect(f.classes.size).toBe(0);
  });
  it('ignora captura antiga e mantém o destino correto com cliques rápidos', () => {
    const f = fixture(); const updates: Array<() => void> = []; const skip = vi.fn();
    f.root.ownerDocument = { startViewTransition: (update: () => void) => {
      updates.push(update); return { ready: Promise.resolve(), finished: new Promise(() => {}), skipTransition: skip };
    } } as unknown as Document;
    f.controller.change(); f.controller.change();
    expect(skip).toHaveBeenCalledOnce();
    updates[0](); expect(f.commit).not.toHaveBeenCalled();
    updates[1](); expect(f.commit).toHaveBeenCalledExactlyOnceWith(false);
    expect(f.root.dataset.pmTheme).toBe('light');
  });
  it('usa alternativa compatível caso o navegador rejeite iniciar a captura', () => {
    const f = fixture();
    f.root.ownerDocument = { startViewTransition: () => { throw new Error('unsupported'); } } as unknown as Document;
    f.controller.change();
    expect(f.classes.has('pm-theme-snapshot')).toBe(false);
    expect(f.classes.has('pm-theme-changing')).toBe(true);
    expect(f.commit).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('movimento reduzido não inicia captura nem animações internas', () => {
    osReduced = true; const f = fixture(); const start = vi.fn();
    f.root.ownerDocument = { startViewTransition: start } as unknown as Document;
    expect(f.controller.change()).toBe(true);
    expect(start).not.toHaveBeenCalled(); expect(f.classes.size).toBe(0);
  });
});
