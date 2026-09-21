import { createFileRoute } from '@tanstack/react-router';
import {
  AcceptInvitationScreen,
  type AcceptInvitationSearch,
} from '@/features/organizations/screens/accept-invitation';

/**
 * The one screen here where both a signed-out and a signed-in reader are
 * legitimate: a new invitee registers from it, and an existing account
 * redeems from it. So it sits directly under `_auth`, which guards nobody,
 * rather than under `_public`, which turns signed-in readers away.
 *
 * This used to be an exception in the layout's guard — `allow:
 * ['/accept-invitation']` on `redirectSignedIn`. Where a route sits now says
 * the same thing, and cannot fall out of step with the path.
 */
export const Route = createFileRoute('/_auth/accept-invitation')({
  validateSearch: (search: Record<string, unknown>): AcceptInvitationSearch => ({
    id: (search.id as string) || undefined,
    email: (search.email as string) || undefined,
    name: (search.name as string) || undefined,
    role: (search.role as string) || undefined,
    inviter: (search.inviter as string) || undefined,
  }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const search = Route.useSearch();

  return <AcceptInvitationScreen {...search} />;
}
