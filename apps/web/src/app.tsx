import { Toaster } from '@flama/design-system-web';
import { useAuthState } from '@flama/frontend-core/react';
import { useTheme } from '@flama/frontend-web';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { SessionGate } from '@/features/auth/sections/session-gate';
import { app } from '@/lib/flama';
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
  // Fetch a route's chunk when the pointer or focus lands on a link to it, so
  // the navigation itself has nothing left to download. `autoCodeSplitting`
  // puts every route in its own file, which otherwise means a click is always
  // a request; the routes carry no `loader`, so this prefetches code only.
  defaultPreload: 'intent',
  // TanStack Query owns data freshness here — every screen reads through it,
  // not through a route loader. Leaving the router's own preload cache at 30s
  // would give a second, disagreeing staleness rule the day a loader appears.
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Guarded routes read `context.auth` in `beforeLoad`, which only re-runs when
// the router is invalidated. The auth store is the thing that changes, so it
// tells the router directly — one subscription at module scope, instead of a
// component watching the flag and invalidating from an effect a render late.
//
// Two details keep this honest. The context is handed to the router *before*
// the invalidation, or the guards would re-run against the previous flag
// (`RouterProvider` re-applies the same context on its next render). And an
// unmounted router is left alone: session restore flips the flag before the
// provider exists, and invalidating then would run the guards with the
// initial `false` and record a redirect to /login before the app has drawn.
app.auth.store.subscribe((state, previous) => {
  if (state.isAuthenticated === previous.isAuthenticated) return;
  router.update({ context: { auth: { isAuthenticated: state.isAuthenticated } } });
  if (router.state.matches.length > 0) router.invalidate();
});

/**
 * The single `Toaster` mount for the app. Sonner renders every `toast()` into
 * *every* mounted `<Toaster>`, so a second one anywhere in the tree shows each
 * toast twice — mount it here and nowhere else.
 */
export function App() {
  // The design system's `Toaster` reads `next-themes`, which this app does not
  // run — left to itself it would fall back to `system` and light up against
  // `prefers-color-scheme` while the rest of the product follows the toggle.
  const { theme } = useTheme();
  const { isAuthenticated } = useAuthState();

  return (
    <>
      <SessionGate>
        <RouterProvider router={router} context={{ auth: { isAuthenticated } }} />
      </SessionGate>
      <Toaster theme={theme} position="bottom-right" />
    </>
  );
}
