import { useAuthState, useSessionRestore } from '@flama/frontend-core/react';
import type { ReactNode } from 'react';
import { SessionError } from '@/features/auth/components/session-error';
import { SessionPending } from '@/features/auth/components/session-pending';
import { useSessionSync } from '@/features/auth/hooks/use-session-sync';

/**
 * Shows `children` to a signed-in person and `signedOut` to anyone else, once
 * the session is known — an extension page has no router to redirect with,
 * so the gate swaps what it renders instead.
 *
 * `isPending`, not `isLoading`, for the reason `apps/web`'s gate gives: under
 * a persisted cache the query sits idle while the cache restores. A failed
 * lookup is an error with a retry, never "signed out": an unreachable API is
 * not a reason to ask for a password.
 */
export function SessionGate({
  children,
  signedOut,
}: {
  children: ReactNode;
  signedOut: ReactNode;
}) {
  useSessionSync();
  const { isPending, isError, isFetching, refetch } = useSessionRestore();
  const { isAuthenticated } = useAuthState();

  if (isPending) return <SessionPending />;
  if (isError) return <SessionError onRetry={() => refetch()} isRetrying={isFetching} />;
  return isAuthenticated ? children : signedOut;
}
