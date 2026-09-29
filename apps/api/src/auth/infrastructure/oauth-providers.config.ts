import { readOAuthConfig } from '../../config/oauth.config';

interface Credentials {
  clientId?: string;
  clientSecret?: string;
}

const configured = (credentials: Credentials): credentials is Required<Credentials> =>
  Boolean(credentials.clientId && credentials.clientSecret);

/**
 * Splits a provider-supplied display name into first/last name parts so that
 * OAuth sign-ups populate the same `firstName` / `lastName` fields used by the
 * email/password flow and the rest of the app.
 */
function splitName(name?: string | null): {
  firstName: string;
  lastName: string;
} {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'User', lastName: '' };
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(' ') };
}

/**
 * One provider's Better Auth settings, under the policy every provider here
 * signs in with.
 *
 * Signing in and signing up are two different intents, so a provider identity
 * nobody here has seen before is *refused* rather than quietly turned into an
 * account. Better Auth ends the round-trip at the caller's `errorCallbackURL`
 * with `?error=signup_disabled`, which the login screens turn into "go and
 * register". The register screen is the only caller that passes
 * `requestSignUp`, which is what lets the same button create the account a
 * moment later. A provider that could still mint accounts from the login
 * screen would make the rule depend on which button was pressed.
 */
function provider({ clientId, clientSecret }: Required<Credentials>) {
  return {
    clientId,
    clientSecret,
    mapProfileToUser: (profile: { name?: string | null }) => splitName(profile.name),
    disableImplicitSignUp: true,
  };
}

/**
 * The social providers Better Auth runs, which `better-auth.config.ts` spreads
 * into its `socialProviders`: Google and GitHub, each once both halves of its
 * credentials are set, so an unconfigured provider is simply not offered.
 */
export function oauthProviders() {
  const { google, github } = readOAuthConfig();
  return {
    ...(configured(google) && { google: provider(google) }),
    ...(configured(github) && { github: provider(github) }),
  };
}
