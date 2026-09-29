/**
 * The capabilities clients have a UI decision hanging on — served by
 * `GET /health/capabilities`. A capability is an optional feature a deployment
 * may or may not have configured (OAuth credentials, an integration's key);
 * the full list, with what turns each one on, is the API's
 * (`apps/api/src/capabilities`), and this is the subset of it that goes over
 * the wire. Server-internal capabilities (`email_delivery`) are deliberately
 * not on it: no client renders anything differently for them, and a public
 * endpoint should not describe a deployment's infrastructure beyond what its UI
 * already reveals.
 */
export const CLIENT_CAPABILITIES = [
  // flama:begin oauth
  'google_oauth',
  'github_oauth',
  // flama:end oauth
  // flama:plugins client-capabilities
] as const;

export type ClientCapability = (typeof CLIENT_CAPABILITIES)[number];

/** `false` means "not configured on this install", not an outage. */
export type ClientCapabilities = Record<ClientCapability, boolean>;
