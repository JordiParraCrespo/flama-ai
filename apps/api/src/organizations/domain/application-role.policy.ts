/** The application roles a membership maps onto; see {@link applicationRoleFor}. */
export const MEMBERSHIP_ROLES = ['owner', 'user'] as const;

/**
 * Map Better Auth membership roles onto the application's system roles.
 *
 * Better Auth's organization roles are not what the app's routes check — CASL
 * is — so a membership only opens its organization once the org-scoped
 * application role is written beside it. `owner`/`admin` on the roster become
 * the tenant-scoped `owner` role, never the global `admin`: that one is
 * `manage all`, and assigned org-scoped it unioned into the caller's ability
 * whenever the organization was active — reaching every non-tenant route,
 * including deleting platform accounts.
 *
 * `role` may be Better Auth's comma-separated list of several.
 */
export function applicationRoleFor(role: string): (typeof MEMBERSHIP_ROLES)[number] {
  return role
    .split(',')
    .map((value) => value.trim())
    .some((value) => value === 'owner' || value === 'admin')
    ? 'owner'
    : 'user';
}
