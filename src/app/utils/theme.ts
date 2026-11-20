// PilaManager 2.0 - Design Tokens

export const colors = {
  light: {
    primary: '#038C8C',
    primaryDark: '#027373',
    primarySecondary: '#038C7F',
    accent: '#30F2DF',
    accentLight: '#C9F2EE',
    bgMain: '#F4FAF9',
    bgSecondary: '#ECF7F5',
    card: '#FFFFFF',
    field: '#F7FBFA',
    textPrimary: '#163C3C',
    textSecondary: '#607B79',
    textMuted: '#879E9C',
    border: '#D7E8E6',
    divider: '#E5F0EF',
    success: '#35A978',
    warning: '#E5A83B',
    error: '#D95C5C',
    info: '#278FA3',
  },
  dark: {
    primary: '#37B69E',
    primaryDark: '#226053',
    primarySecondary: '#55A395',
    accent: '#37B69E',
    accentLight: '#1B5650',
    bgMain: '#072326',
    bgSecondary: '#0D2D30',
    card: '#13383A',
    field: '#184244',
    textPrimary: '#EAF7F4',
    textSecondary: '#B7D5CF',
    textMuted: '#87AAA3',
    border: '#2A5A57',
    divider: '#214947',
    success: '#4DC08D',
    warning: '#E2B04A',
    error: '#D96B6B',
    info: '#4FB7C5',
  }
};

export type ThemeColors = typeof colors.light;

export function getTheme(isDark: boolean): ThemeColors {
  return isDark ? colors.dark : colors.light;
}
