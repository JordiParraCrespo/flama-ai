import type { BetterAuthOptions } from 'better-auth';
import type { SocialProviders } from 'better-auth/social-providers';

/**
 * Splits a provider-supplied display name into first/last name parts so that
 * social sign-ups populate the same `firstName` / `lastName` fields used by the
 * email/password flow and the rest of the app.
 */
export function splitName(name?: string | null): {
  firstName: string;
  lastName: string;
} {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'User', lastName: '' };
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(' ') };
}

/**
 * The policy every social provider signs in with, spread into each one's
 * settings in `socialProviders`.
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
export const signInPolicy = {
  mapProfileToUser: (profile: { name?: string | null }) => splitName(profile.name),
  disableImplicitSignUp: true,
};

/**
 * The social sign-in providers Better Auth runs, which `better-auth.config.ts`
 * passes in: each one keyed by its Better Auth id, with its credentials and
 * `signInPolicy`, and each only once this deployment has those credentials.
 */
export const socialProviders: SocialProviders = {};

/**
 * How a provider's identity joins an account that already has its address,
 * which `better-auth.config.ts` spreads into its options.
 */
export const accountLinking = {
  account: {
    accountLinking: {
      // Someone who registered with a password and later signs in with a
      // provider on the same address is the same person, so the provider's
      // identity is attached to the account they already have. Without this
      // they hit `account_not_linked` on every social sign-in and the only way
      // back in is the password they may have come here to stop using.
      enabled: true,
      // Deliberately empty. A "trusted" provider is linked *without* checking
      // whether the provider itself verified the address — and an unverified
      // address is exactly the one somebody else can claim. A provider that
      // reports `email_verified` loses nothing by staying untrusted, and the
      // check stays in force.
      trustedProviders: [],
      // The other half of that check, on our side of the link: the existing
      // account must have proven the address too. Sign-up here does not
      // require verification (`requireEmailVerification: false` in
      // `better-auth.config.ts`), so without this anyone could register a
      // password account on an address they do not own and be handed the real
      // owner's account the moment that person signs in with a provider.
      // Unverified accounts get `account_not_linked` instead, which the login
      // screen turns into "sign in with your password" — a dead end only for
      // the attacker.
      requireLocalEmailVerified: true,
    },
  },
} satisfies BetterAuthOptions;
