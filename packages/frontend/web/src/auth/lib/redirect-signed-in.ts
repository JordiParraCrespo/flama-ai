import { redirect } from '@tanstack/react-router';
import { sanitizeRedirect } from '../../platform';
import type { NavTo } from '../../shell';

/** The sign-in screen both apps publish, and the one both bounce to. */
const LOGIN: NavTo = '/login';

interface RedirectSignedInArgs {
  context: { auth: { isAuthenticated: boolean } };
  location: { search: unknown };
  /** Where a signed-in visitor of an auth page is sent when nothing else asks. */
  landing: NavTo;
}

interface RedirectSignedOutArgs {
  context: { auth: { isAuthenticated: boolean } };
  /**
   * `href`, not `pathname`: a deep link's search params are part of where the
   * reader was going (`/settings?section=security`), and dropping them lands
   * them somewhere else after they sign in.
   */
  location: { href: string };
}

/**
 * A signed-in visitor has no business on a sign-in screen, so they are sent
 * on — to the `?redirect=` a deep link carried, or to the app's landing.
 *
 * A deep link opened cold is matched before the session store has caught up
 * with the restore query, so the signed-out guard bounces it here with the
 * original path in `redirect`. Honouring it is what lands the reader on the
 * page they asked for instead of the dashboard.
 *
 * Sanitised with the same rule the login form applies before it sends a
 * reader on: `?redirect=https://evil.example` on a link an authenticated
 * reader opens would otherwise be an open redirect.
 *
 * This takes no list of paths to let through. A route that both a signed-in
 * and a signed-out reader may open does not belong under this guard at all —
 * it belongs beside it, under a parent that guards nobody. An exception named
 * here is a second copy of the tree, and it can fall out of step with the path
 * it names; where a route sits cannot.
 */
export function redirectSignedIn({ context, location, landing }: RedirectSignedInArgs) {
  if (!context.auth.isAuthenticated) return;

  const requested = sanitizeRedirect((location.search as { redirect?: unknown }).redirect);
  if (requested) throw redirect({ href: requested });
  throw redirect({ to: landing });
}

/**
 * The other half: a signed-out reader has no business on a screen that is only
 * meaningful once they are signed in, so they are sent to `/login` carrying
 * where they were going, which {@link redirectSignedIn} hands back afterwards.
 *
 * The two are a pair, and a route picks one of them or neither. Writing this
 * redirect inline is how the login target and the `href`-not-`pathname` rule
 * drift apart between the routes that need them.
 */
export function redirectSignedOut({ context, location }: RedirectSignedOutArgs) {
  if (context.auth.isAuthenticated) return;

  throw redirect({ to: LOGIN, search: { redirect: location.href } });
}
