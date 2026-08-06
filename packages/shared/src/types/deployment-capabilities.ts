/**
 * The optional capabilities a deployment may or may not have, resolved from
 * configuration once at boot. Each one maps to config a self-hoster might not
 * have (OAuth credentials, a Stripe key, S3 credentials, SMTP/Resend settings);
 * a missing key removes the capability — it never prevents the app from
 * booting. Required settings (database, `BETTER_AUTH_SECRET`) are the
 * opposite: they fail fast at boot and are not capabilities.
 */
export const DEPLOYMENT_CAPABILITIES = [
  'google_oauth',
  'github_oauth',
  'stripe_billing',
  's3_storage',
  'email_delivery',
] as const;

export type DeploymentCapability = (typeof DEPLOYMENT_CAPABILITIES)[number];

/**
 * Which optional features a deployment can actually serve. `false` means "not
 * configured on this install", not an outage. Served by
 * `GET /health/capabilities` so clients can hide UI for missing capabilities.
 */
export type DeploymentCapabilities = Record<DeploymentCapability, boolean>;
