/**
 * Prefix a generated hey-api query key with the feature name Flama persist
 * and invalidation already use (`queryKey[0] === 'users'`).
 */
export function withFeaturePrefix<const T extends readonly unknown[]>(
  feature: string,
  key: T,
): [string, ...T] {
  return [feature, ...key];
}

/**
 * Query keys of the signed-in user's own preferences. Here rather than beside
 * the hooks in `user-settings.queries.ts` for the same reason as `authKeys`
 * below: `persistence.ts` reads it at module load.
 */
export const userSettingsKeys = {
  all: ['userSettings'] as const,
  me: () => [...userSettingsKeys.all, 'me'] as const,
};

/**
 * The query key every organization member list starts with, whatever product
 * renders it. It lives in the kernel because two products meet on it: the
 * consumer product lists members under it, and the admin product invalidates
 * it when it changes something those lists are filtered by (a user's roles).
 * Neither package imports the other; both import this.
 */
export const MEMBER_LISTS_KEY = ['organizations', 'members'] as const;

/**
 * Query key factory for the `auth` feature. Defined here rather than in
 * `auth.queries.ts` because `persistence.ts` needs it at module load, and
 * `auth.queries.ts` imports `persistence.ts`: keeping it here breaks the cycle.
 * Every key is derived from `all` so the whole subtree can be invalidated/cleared with a single key. See the
 * "React Query keys" guide in the docs for the rationale.
 */
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};
