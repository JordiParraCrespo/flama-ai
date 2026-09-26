import { useOrganizations } from '@flama/frontend-consumer/organizations';
import type { ShellWorkspace } from '@flama/frontend-web';
import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

/**
 * The product shell is for people who have somewhere to work.
 *
 * Registering does not provision a workspace, so a signed-in account can
 * legitimately belong to none — and the screens in the shell are scoped to an
 * organization, which for that account is a refusal. Send them to onboarding,
 * where they create their first workspace or accept the invitation that is
 * waiting for them, instead of letting the app tell them on their first screen
 * that they do not have permission to look at it.
 *
 * The redirect waits for a *settled, successful, empty* list. While the query
 * is in flight — including the background refetch that follows creating a
 * workspace or accepting an invitation, when the cache still holds the `[]`
 * that sent them to onboarding — or if it failed, the shell renders as it
 * always did: guessing "nowhere to work" from an unanswered question would
 * bounce every reader out of the app on a network blip, or straight back to
 * the onboarding screen they just left.
 *
 * Otherwise the shell names the first organization the caller belongs to.
 * Keeping it on the same list query as General Settings means a saved name or
 * logo is reflected here immediately from the query cache.
 */
export function WorkspaceGate({
  children,
}: {
  children: (workspace: ShellWorkspace | undefined) => ReactNode;
}) {
  const organizations = useOrganizations();

  const settledEmpty =
    organizations.isSuccess && !organizations.isFetching && organizations.data.length === 0;
  if (settledEmpty) return <Navigate to="/onboarding" replace />;

  const organization = organizations.data?.[0];
  return children(organization ? { name: organization.name, logo: organization.logo } : undefined);
}
