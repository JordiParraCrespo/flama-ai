import { usePageView } from '@flama/frontend-core/react';
import { useRouterState } from '@tanstack/react-router';

/**
 * Reports page views to analytics on every navigation.
 *
 * TanStack Router navigations are client-side, so the provider's own automatic
 * capture only ever sees the first hard load. Renders nothing; it exists purely
 * so the hook sits inside `FlamaProvider`. Mirrors `ScreenViewTracker` in the
 * mobile app.
 *
 * The pathname only — several routes carry secrets in the query string
 * (`/reset-password?token=…`). That alone does not close the leak: a provider
 * attaches the full URL to every event on its own, so an adapter strips query
 * strings there too, with `sanitizeUrlProperties` from the kernel.
 */
export function PageViewTracker() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  usePageView(pathname);

  return null;
}
