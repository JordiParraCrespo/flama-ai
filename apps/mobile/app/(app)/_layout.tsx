import { useOrganizations } from '@flama/frontend-consumer/react';
import { THEME } from '@flama/frontend-mobile/theme';
import { Redirect, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

export default function AppLayout() {
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();
  // The header is drawn by React Navigation, which takes plain values rather
  // than classes: the kit's `THEME` mirrors the tokens in `global.css`.
  const palette = THEME[colorScheme === 'dark' ? 'dark' : 'light'];
  const organizations = useOrganizations();

  // An account belongs nowhere until it creates a workspace or accepts an
  // invitation, and every screen in here is organization-scoped. Redirect only
  // on a settled, successful, empty list: while a refetch is in flight (right
  // after creating one) or after a failure, guessing "nowhere to work" would
  // bounce the reader back out on a network blip.
  const settledEmpty =
    organizations.isSuccess && !organizations.isFetching && organizations.data.length === 0;
  if (settledEmpty) return <Redirect href="/onboarding" />;

  return (
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
}
