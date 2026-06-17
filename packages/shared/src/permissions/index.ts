import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
  type MongoQuery,
} from '@casl/ability';
import type { Role } from '../types';

/**
 * Actions and subjects are free-form strings: admins define roles and their
 * permissions at runtime, so the catalog is open-ended rather than a closed
 * union. The well-known values below are exported for convenience (seeding,
 * UI) without constraining what can be stored.
 */
export type Actions = string;
export type Subjects = string;

/** Built-in actions used by the seeded system roles. */
export const KNOWN_ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;
/** Built-in subjects used by the seeded system roles. `all` is CASL's wildcard. */
export const KNOWN_SUBJECTS = ['User', 'Article', 'Role', 'all'] as const;

export type AppAbility = MongoAbility<[Actions, Subjects]>;

/**
 * A single CASL rule as stored on a role. `conditions` enables resource
 * scoping (e.g. `{ authorId: '${user.id}' }` — only own resources); the
 * `${...}` placeholders are interpolated against the request context when the
 * ability is built. `inverted` turns the rule into a `cannot`, `fields`
 * restricts it to specific attributes.
 */
export interface PermissionDefinition {
  action: Actions;
  subject: Subjects;
  conditions?: Record<string, unknown>;
  fields?: string[];
  inverted?: boolean;
  /** Human-readable explanation surfaced when the rule denies access. */
  reason?: string;
}

/** Context made available to `${...}` placeholders in permission conditions. */
export interface AbilityContext {
  user?: Record<string, unknown> | null;
}

const PLACEHOLDER = /^\$\{([^}]+)\}$/;

/** Resolve a dotted path (e.g. `user.id`) against the ability context. */
function resolvePath(path: string, context: AbilityContext): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, context);
}

/**
 * Deep-clone `conditions`, replacing any string value of the form `${path}`
 * with the corresponding value from the context. Non-placeholder values are
 * passed through untouched.
 */
// CASL parameterizes conditions by the subject's field type. Because our
// subjects are free-form strings (not typed records), that collapses to
// `MongoQuery<never>`; conditions are validated at runtime instead.
type AbilityConditions = MongoQuery<never>;

function interpolateConditions(
  conditions: Record<string, unknown>,
  context: AbilityContext,
): AbilityConditions {
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const match = value.match(PLACEHOLDER);
      return match ? resolvePath(match[1], context) : value;
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, walk(v)]),
      );
    }
    return value;
  };

  return walk(conditions) as AbilityConditions;
}

/**
 * Build a CASL ability from a flat list of permission definitions — typically
 * the union of every role assigned to a user. This is the single source of
 * truth for authorization now that roles and their permissions live in the
 * database.
 */
export function defineAbilitiesFromPermissions(
  permissions: PermissionDefinition[],
  context: AbilityContext = {},
): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  for (const permission of permissions) {
    const apply = permission.inverted ? cannot : can;
    const conditions = permission.conditions
      ? interpolateConditions(permission.conditions, context)
      : undefined;

    // Call the correct CASL overload: `(action, subject, fields, conditions)`
    // when fields are present, otherwise `(action, subject, conditions)` — so a
    // bare `conditions` is never mistaken for `fields`.
    if (permission.fields && permission.fields.length > 0) {
      apply(permission.action, permission.subject, permission.fields, conditions);
    } else {
      apply(permission.action, permission.subject, conditions);
    }
  }

  return build();
}

/**
 * Permissions granted to the seeded **system roles**. Used by the migration /
 * seed to provision `admin` and `user`, and as the fallback for the legacy
 * single-role column before a user is migrated to the join table.
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<string, PermissionDefinition[]> = {
  admin: [{ action: 'manage', subject: 'all' }],
  user: [
    { action: 'read', subject: 'User' },
    { action: 'update', subject: 'User' },
    { action: 'read', subject: 'Article' },
    { action: 'create', subject: 'Article' },
  ],
};

/**
 * Backwards-compatible helper that builds an ability from a single role name
 * using the seeded system-role permissions. Prefer
 * {@link defineAbilitiesFromPermissions} with the user's real, DB-backed
 * permissions; this remains for the legacy fallback path and the frontend.
 */
export function defineAbilitiesFor(role: Role, context: AbilityContext = {}): AppAbility {
  return defineAbilitiesFromPermissions(SYSTEM_ROLE_PERMISSIONS[role] ?? [], context);
}
