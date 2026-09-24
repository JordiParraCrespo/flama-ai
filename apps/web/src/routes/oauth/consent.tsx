import { redirectSignedOut } from '@flama/frontend-web';
import { createFileRoute } from '@tanstack/react-router';
import type { ConsentSearch } from '@/features/auth/lib/consent';
import { OAuthConsentScreen } from '@/features/auth/screens/oauth-consent';

/**
 * OAuth consent screen.
 *
 * Signing in first is required, so an unauthenticated visitor is bounced to
 * the login page and returned here.
 */
export const Route = createFileRoute('/oauth/consent')({
  validateSearch: (search: Record<string, unknown>): ConsentSearch => ({
    consent_code: (search.consent_code as string) || undefined,
    client_id: (search.client_id as string) || undefined,
    scope: (search.scope as string) || undefined,
  }),
  beforeLoad: ({ context, location }) => redirectSignedOut({ context, location }),
  component: ConsentPage,
});

function ConsentPage() {
  const search = Route.useSearch();

  return <OAuthConsentScreen search={search} />;
}
