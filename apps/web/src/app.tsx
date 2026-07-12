import { useAuthState, useSessionRestore } from '@flama/frontend/react';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { routeTree } from './routeTree.gen';

export interface RouterContext {
  auth: {
    isAuthenticated: boolean;
  };
}

const router = createRouter({
  routeTree,
  context: {
    auth: { isAuthenticated: false },
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const { isAuthenticated } = useAuthState();
  // Rehydrate a persisted session (tokens in localStorage) before the router's
  // route guards run, so a returning/refreshing authenticated user isn't bounced
  // to /login. Mirrors the mobile root AuthGate, which gates on the same query.
  const { isLoading } = useSessionRestore();

  const context = useMemo(() => ({ auth: { isAuthenticated } }), [isAuthenticated]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-invalidate the router whenever auth state flips so guarded routes re-run
  useEffect(() => {
    router.invalidate();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div
          role="status"
          aria-label="Loading"
          className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        />
      </div>
    );
  }

  return <RouterProvider router={router} context={context} />;
}
