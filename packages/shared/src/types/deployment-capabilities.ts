/**
 * The capabilities clients have a UI decision hanging on — served by
 * `GET /health/capabilities`. A capability is an optional feature a deployment
 * may or may not have configured (a sign-in provider, an integration's key);
 * the full list, with what turns each one on, is the API's
 * (`apps/api/src/capabilities`), and this is the subset of it that goes over
 * the wire. Server-internal capabilities are deliberately
 * not on it: no client renders anything differently for them, and a public
 * endpoint should not describe a deployment's infrastructure beyond what its UI
 * already reveals.
 */
export const CLIENT_CAPABILITIES = [
  // flama:plugins client-capabilities
] as const;

/**
 * A capability's name on the wire. Typed as any name, so the type holds
 * whether the list above is empty or not: `CLIENT_CAPABILITIES` is what the
 * API actually serves, and the API checks each entry against its own table.
 */
export type ClientCapability = string;

/**
 * What `GET /health/capabilities` returns: each capability on the list, and
 * whether it is on. `false` means "not configured on this install", not an
 * outage.
 */
export type ClientCapabilities = Record<ClientCapability, boolean>;
