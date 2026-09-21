import { redirectSignedOut } from '@flama/frontend-web';
import { createFileRoute } from '@tanstack/react-router';
import { OnboardingScreen } from '@/features/organizations/screens/onboarding';

/**
 * Where a signed-in account with no workspace starts: it creates a first
 * organization or accepts a pending invitation. A signed-out visitor is sent
 * to the login page and returned here.
 *
 * Under `_auth` for the chrome, with its own guard because the sign-in screens
 * beside it want the opposite one. Not pathless: this file *is* the
 * `/onboarding` segment, which is why the URL is unchanged by the move.
 */
export const Route = createFileRoute('/_auth/onboarding')({
  beforeLoad: ({ context, location }) => redirectSignedOut({ context, location }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return <OnboardingScreen />;
}
