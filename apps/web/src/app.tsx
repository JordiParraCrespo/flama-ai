import { useAuthState } from '@flama/frontend/react';
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

  const context = useMemo(() => ({ auth: { isAuthenticated } }), [isAuthenticated]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-invalidate the router whenever auth state flips so guarded routes re-run
  useEffect(() => {
    router.invalidate();
  }, [isAuthenticated]);

  return <RouterProvider router={router} context={context} />;
}
