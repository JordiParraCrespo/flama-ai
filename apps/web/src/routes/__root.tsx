import { usePageView } from '@flama/frontend/react';
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router';
import type { RouterContext } from '@/app';

function RootLayout() {
  // The pathname only — several routes carry secrets in the query string
  // (`/reset-password?token=…`). Query strings are also stripped from the URL
  // properties PostHog attaches to every event; see `stripUrlSecrets` in
  // `lib/analytics.ts`, which is what actually closes that leak.
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  usePageView(pathname);

  return <Outlet />;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});
