import appConfig from '../config/appConfig';

export type ThemeColors = typeof appConfig.theme.dark;

export const Colors: {
  dark: ThemeColors;
  light: typeof appConfig.theme.light;
} = appConfig.theme;