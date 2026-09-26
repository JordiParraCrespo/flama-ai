import { useOrganizations } from '@flama/frontend-consumer/organizations';
import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * An account belongs nowhere until it creates a workspace or accepts an
 * invitation, and every screen behind this gate is organization-scoped.
 * Redirect only on a settled, successful, empty list: while a refetch is in
 * flight (right after creating one) or after a failure, guessing "nowhere to
 * work" would bounce the reader back out on a network blip.
 */
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const organizations = useOrganizations();

  const settledEmpty =
    organizations.isSuccess && !organizations.isFetching && organizations.data.length === 0;
  if (settledEmpty) return <Redirect href="/onboarding" />;

  return children;
}
