import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { RouterContext } from '@/app';
import { PageViewTracker } from '@/lib/analytics';

function RootLayout() {
  return (
    <>
      <PageViewTracker />
      <Outlet />
    </>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});
