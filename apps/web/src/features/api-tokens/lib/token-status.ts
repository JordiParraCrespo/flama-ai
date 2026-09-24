import type { ApiTokenEntity } from '@flama/frontend-consumer';

/**
 * The token's lifecycle on the brand's status set (the `Badge` variants
 * `active`, `paused`, `ended`). `expired` is `paused` rather than
 * `ended`: it stopped working on its own and can be replaced, where `revoked`
 * was a decision someone made.
 */
export const TOKEN_STATUS_VARIANT = {
  active: 'active',
  expired: 'paused',
  revoked: 'ended',
} as const satisfies Record<ApiTokenEntity['status'], 'active' | 'paused' | 'ended'>;

export const TOKEN_STATUS_LABEL = {
  active: 'apiTokens.active',
  expired: 'apiTokens.expired',
  revoked: 'apiTokens.revoked',
} as const satisfies Record<ApiTokenEntity['status'], string>;

/** Lifetimes offered in the form, in days. `null` means "does not expire". */
export const LIFETIMES: (number | null)[] = [7, 30, 90, 365, null];

/** The design's tokens table shows eight rows before it pages. */
export const TOKEN_PAGE_SIZE = 8;
