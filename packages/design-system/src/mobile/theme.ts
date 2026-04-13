import { createTamagui, createTokens } from '@tamagui/core';
import { borderRadius, colors, spacing } from '../tokens';

const tokens = createTokens({
  color: {
    primary: colors.primary[500],
    primaryLight: colors.primary[100],
    primaryDark: colors.primary[700],
    background: colors.neutral[50],
    backgroundDark: colors.neutral[900],
    text: colors.neutral[900],
    textDark: colors.neutral[50],
    textMuted: colors.neutral[500],
    border: colors.neutral[200],
    borderDark: colors.neutral[700],
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
  },
  space: spacing,
  size: spacing,
  radius: borderRadius,
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

export const tamaguiConfig = createTamagui({
  tokens,
  themes: {
    light: {
      background: tokens.color.background,
      color: tokens.color.text,
      borderColor: tokens.color.border,
      primary: tokens.color.primary,
    },
    dark: {
      background: tokens.color.backgroundDark,
      color: tokens.color.textDark,
      borderColor: tokens.color.borderDark,
      primary: tokens.color.primary,
    },
  },
});

export type AppConfig = typeof tamaguiConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}
