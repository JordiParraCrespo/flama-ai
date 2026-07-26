import { usePageView } from '@flama/frontend/react';
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router';
import type { RouterContext } from '@/app';

function RootLayout() {
  // Deliberately the pathname only, never the full location: several routes
  // carry secrets in the query string (`/reset-password?token=…`), and those
  // must not be shipped to a third-party analytics provider.
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  usePageView(pathname);

  return <Outlet />;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});
