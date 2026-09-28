/**
 * DI tokens for the auth module.
 *
 * `auth` is `@Global`, so what it binds here is the whole application's way of
 * asking these questions. Other modules inject the token and depend on the
 * port beside it — never on the adapter, which is where Better Auth lives.
 */

/** Mints and reuses a session so a scoped credential can act as its owner. */
export const DELEGATED_SESSION = Symbol('DELEGATED_SESSION');

/** Turns the credential on a request into a scope context. */
export const CREDENTIAL_SCOPE = Symbol('CREDENTIAL_SCOPE');

/** The scoped credential the API accepts beside sessions, when it has one. */
export const SCOPED_CREDENTIAL = Symbol('SCOPED_CREDENTIAL');

/** The organizations a user belongs to, when the API has organizations. */
export const ORGANIZATION_MEMBERSHIP = Symbol('ORGANIZATION_MEMBERSHIP');

/** Verifies a presented credential against the identity provider. */
export const CREDENTIAL_VERIFIER = Symbol('CREDENTIAL_VERIFIER');

/** Builds the caller's effective CASL ability for a request. */
export const ABILITY = Symbol('ABILITY');
