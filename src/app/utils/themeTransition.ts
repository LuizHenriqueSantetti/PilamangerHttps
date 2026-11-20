export const THEME_TRANSITION_MS = 420;
export type ThemeMotionPreference = 'auto' | 'smooth' | 'off';
const PREFERENCE_KEY = 'preferences_themeMotion';
export function readThemeMotionPreference(): ThemeMotionPreference {
  try {
    const value = localStorage.getItem(PREFERENCE_KEY);
    return value === 'smooth' || value === 'off' ? value : 'auto';
  } catch { return 'auto'; }
}
export function saveThemeMotionPreference(value: ThemeMotionPreference) {
  localStorage.setItem(PREFERENCE_KEY, value);
}

export function createThemeTransition(root: HTMLElement, commit: (dark: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let snapshot: ViewTransition | undefined;
  let generation = 0;
  let pendingDark: boolean | undefined;
  const clear = () => {
    generation++;
    clearTimeout(timer);
    snapshot?.skipTransition();
    snapshot = undefined;
    pendingDark = undefined;
    root.classList.remove('pm-theme-changing');
    root.classList.remove('pm-theme-snapshot');
    root.dataset.pmThemeMotion = 'idle';
  };
  return {
    change(nextDark = pendingDark === undefined ? root.dataset.pmTheme !== 'dark' : !pendingDark) {
      clear();
      const currentGeneration = generation;
      pendingDark = nextDark;
      const preference = readThemeMotionPreference();
      const reduced = root.classList.contains('pm-a11y-reduced-motion') || preference === 'off'
        || (preference === 'auto' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const apply = () => {
        if (generation !== currentGeneration) return;
        root.dataset.pmTheme = nextDark ? 'dark' : 'light';
        commit(nextDark);
      };
      const document = root.ownerDocument;
      if (!reduced && typeof document?.startViewTransition === 'function') {
        // One captured root = one clock for sidebar, header, content and open panels.
        // Disable nested transitions so the new snapshot already has the final palette.
        root.classList.add('pm-theme-snapshot');
        root.dataset.pmThemeMotion = 'snapshot';
        try {
          snapshot = document.startViewTransition(apply);
          const finish = () => {
            if (generation !== currentGeneration) return;
            snapshot = undefined;
            clear();
          };
          void snapshot.ready.catch(() => {});
          void snapshot.finished.then(finish, finish);
          return false;
        } catch {
          root.classList.remove('pm-theme-snapshot');
        }
      }
      root.dataset.pmThemeMotion = reduced ? 'reduced' : 'colors';
      if (!reduced) {
        root.classList.add('pm-theme-changing');
        // Establish the previous computed colors before React changes any inline palettes.
        void root.offsetWidth;
      }
      apply();
      if (!reduced) timer = setTimeout(clear, THEME_TRANSITION_MS + 80);
      return reduced;
    },
    dispose: clear,
  };
}
