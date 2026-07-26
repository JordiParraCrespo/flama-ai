import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * Stripe billing configuration. Every value is optional so the app boots
 * without Stripe configured (per `.agents/rules/api-config.md`) — the billing
 * endpoints then fail fast with a clear "billing not configured" error instead
 * of crashing the process at startup.
 */
const schema = z.object({
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  /** Fallback redirect URLs for Checkout / Customer Portal (per-request overridable). */
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  portalReturnUrl: z.string().url().optional(),
});

/** Treat unset OR blank ("STRIPE_X=") env vars alike, so `.url().optional()` boots. */
const orUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const stripeConfig = registerAs('stripe', () => {
  return schema.parse({
    secretKey: orUndefined(process.env.STRIPE_SECRET_KEY),
    webhookSecret: orUndefined(process.env.STRIPE_WEBHOOK_SECRET),
    successUrl: orUndefined(process.env.STRIPE_SUCCESS_URL),
    cancelUrl: orUndefined(process.env.STRIPE_CANCEL_URL),
    portalReturnUrl: orUndefined(process.env.STRIPE_PORTAL_RETURN_URL),
  });
});
