import { useAuthState } from '@flama/frontend-core/react';
import { Stack } from 'expo-router';
import { SessionRestoreOverlay } from './session-restore-overlay';

/** The routes a signed-in reader may open, beside the app itself. */
const SIGNED_IN_ROUTES: string[] = [
  '(app)',
  // flama:begin organizations
  'onboarding',
  // flama:end organizations
  // flama:plugins signed-in-routes
];

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
          {SIGNED_IN_ROUTES.map((name) => (
            <Stack.Screen key={name} name={name} />
          ))}
        </Stack.Protected>
      </Stack>
      <SessionRestoreOverlay />
    </>
  );
}
