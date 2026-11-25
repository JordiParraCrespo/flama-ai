/**
 * The deep-link schemes a deployment's phone apps sign in through, keyed by
 * the variable that names each one (`{ MOBILE_SCHEME: process.env.MOBILE_SCHEME }`),
 * so a refusal can say which variable to fix.
 */
export type AppSchemeEnv = Record<string, string | undefined>;

// RFC 3986's scheme grammar.
const SCHEME = /^[a-z][a-z0-9+.-]*$/i;

// Schemes that name the web, not an app: trusting `https://` would trust every
// site there is.
const WEB_SCHEMES = new Set(['http', 'https', 'ws', 'wss', 'file', 'data', 'javascript']);

/**
 * The trusted origins Better Auth gets for the phone apps: `${scheme}://` for
 * each variable that is set, so a social sign-in or a password reset may end
 * in the app.
 *
 * Opt-in, with no default. A custom scheme is not owned by anybody: on Android
 * any installed app can register the same scheme and be offered the redirect
 * that carries the session. So a deployment no phone app signs in to trusts no
 * scheme, and one that does names its scheme, where it is a choice somebody
 * made. Unset and blank mean the same.
 *
 * A value that is not a scheme, or names a web scheme, stops the boot: it
 * would otherwise either trust the web or leave the app's sign-in broken with
 * nothing saying why.
 */
export function appSchemeOrigins(env: AppSchemeEnv): string[] {
  const origins: string[] = [];
  for (const [variable, scheme] of Object.entries(env)) {
    if (!scheme?.trim()) continue;
    if (!SCHEME.test(scheme) || WEB_SCHEMES.has(scheme.toLowerCase())) {
      throw new Error(
        `${variable} must be the app's own URL scheme (letters, digits, "+", "-", "."), not "${scheme}".`,
      );
    }
    origins.push(`${scheme}://`);
  }
  return origins;
}
