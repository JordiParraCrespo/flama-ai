import { THEME } from '@flama/frontend-mobile/theme';
import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import type { ComponentType, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

// flama:begin organizations
import { WorkspaceGate } from '../../features/organizations/sections/workspace-gate';

// flama:end organizations
// flama:plugins app-gate-imports

/** Stands between a signed-in reader and the app's screens. */
type AppGate = ComponentType<{ children: ReactNode }>;

/**
 * The gates the app opens through. With organizations, one sends an account
 * that belongs nowhere to onboarding; with none, the app opens straight away.
 */
const GATES: AppGate[] = [
  // flama:begin organizations
  WorkspaceGate,
  // flama:end organizations
  // flama:plugins app-gates
];

export default function AppLayout() {
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();
  // The header is drawn by React Navigation, which takes plain values rather
  // than classes: the kit's `THEME` mirrors the tokens in `global.css`.
  const palette = THEME[colorScheme === 'dark' ? 'dark' : 'light'];

  const stack = (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.foreground,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerTitle: t('common.appName'), headerShadowVisible: false }}
      />
    </Stack>
  );
  const [Gate] = GATES;
  return Gate ? <Gate>{stack}</Gate> : stack;
}
