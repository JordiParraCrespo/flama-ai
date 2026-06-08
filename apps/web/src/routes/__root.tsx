import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { RouterContext } from '@/app';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
