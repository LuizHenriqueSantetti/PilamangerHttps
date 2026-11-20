// Sistema de controle de animações
export const setAnimationsEnabled = (enabled: boolean): void => {
  localStorage.setItem('animationsEnabled', enabled.toString());
};

export const getAnimationsEnabled = (): boolean => {
  const stored = localStorage.getItem('animationsEnabled');
  return stored !== 'false'; // Por padrão, animações estão ativadas
};

export const getCardAnimationClass = (): string => {
  return getAnimationsEnabled() ? 'transition-all hover:scale-[1.02] active:scale-[0.98]' : '';
};

export const getCardAnimationStyle = (): React.CSSProperties => {
  return getAnimationsEnabled()
    ? { transition: 'transform 0.2s ease' }
    : {};
};
