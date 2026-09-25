import { useSessionRestore } from '@flama/frontend-core/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionRestoreError } from '@/features/auth/components/session-restore-error';

/**
 * Holds the app until a persisted session is known.
 *
 * Rehydrates a persisted session (tokens in localStorage) before the router's
 * route guards run, so a returning/refreshing authenticated user isn't bounced
 * to /login. Mirrors the mobile root AuthGate, which gates on the same query.
 * `isPending`, not `isLoading`: under `PersistQueryClientProvider` a query
 * sits idle while the persisted cache is restored, and `isLoading` (pending
 * *and* fetching) is false for that window. Gating on it mounted the router
 * before the session was known, so every signed-in cold load bounced to
 * /login and back. `isPending` holds until the answer is in.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { isPending, isError, isFetching, refetch } = useSessionRestore();

  if (isPending) {
    // Hand-rolled: the design system ships no spinner, and a skeleton would
    // guess at a layout the router has not picked yet.
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div
          role="status"
          aria-label={t('common.loading')}
          className="size-8 animate-spin rounded-full border-2 border-border-subtle border-t-surface-inverse"
        />
      </div>
    );
  }

  // Restoring the session failed (network/server error). Surface it with a retry
  // instead of rendering the router, which would treat the user as
  // unauthenticated and bounce them to /login as if they'd been logged out.
  if (isError) {
    return <SessionRestoreError onRetry={() => refetch()} isRetrying={isFetching} />;
  }

  return children;
}
