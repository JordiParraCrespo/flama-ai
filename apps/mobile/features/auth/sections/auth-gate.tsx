import { useAuthState } from '@flama/frontend-core/react';
import { Stack } from 'expo-router';
import { SessionRestoreOverlay } from './session-restore-overlay';

/**
 * The root navigator, guarded by who is signed in. It is mounted by the root
 * layout rather than a route, so it is a section, not a screen.
 *
 * It reads only `isAuthenticated`; the restore's loading and retry state
 * belongs to the overlay beside it, so a session refetch redraws the overlay
 * and never the navigator.
 */
export function AuthGate() {
  const { isAuthenticated } = useAuthState();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
          {/* flama:begin organizations */}
          <Stack.Screen name="onboarding" />
          {/* flama:end organizations */}
        </Stack.Protected>
      </Stack>
      <SessionRestoreOverlay />
    </>
  );
}
