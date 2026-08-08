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
export const KNOWN_SUBJECTS = [
  'User',
  'Article',
  'Role',
  'Organization',
  'Workspace',
  'Member',
  'Invitation',
  'ApiToken',
  'AuditLog',
  'Billing',
  'all',
] as const;

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

/**
 * Context made available to `${...}` placeholders in permission conditions.
 *
 * `user` powers own-resource scoping (`${user.id}`); `activeOrganizationId`
 * powers tenant scoping (`${activeOrganizationId}`) — the natural hook for
 * row-level "only within my active organization" rules once resources carry an
 * `organizationId` column.
 */
export interface AbilityContext {
  user?: Record<string, unknown> | null;
  /** The caller's active organization (from `session.activeOrganizationId`). */
  activeOrganizationId?: string | null;
  /** The caller's active workspace/team (from `session.activeTeamId`). */
  activeTeamId?: string | null;
  /** The caller's resolved access scope, for `${scope.*}` placeholders. */
  scope?: AbilityScopeContext;
}

/** Grants the caller holds over one resource type: specific ids, or all of them. */
export type ScopeGrant = readonly string[] | 'all';

/**
 * The scope half of the ability context. Mirrors the backend's `AccessScope`
 * without depending on it — this package must stay free of server concerns.
 *
 * The array-valued members are what make set-membership scoping expressible as
 * a CASL condition (`{ teamId: { $in: '${scope.teamIds}' } }`), which is what
 * keeps `ability.can()` honest about rows the caller cannot actually reach.
 */
export interface AbilityScopeContext {
  organizationId?: string | null;
  /** Teams the caller belongs to in the active organization. */
  teamIds?: readonly string[];
  /** Explicit grants, keyed by resource subject. */
  grants?: Readonly<Record<string, ScopeGrant>>;
}

const PLACEHOLDER = /^\$\{([^}]+)\}$/;

/**
 * Marks a placeholder that resolved to "no restriction at all" — an `'all'`
 * grant. The branch it appears in is dropped from the conditions rather than
 * interpolated, because the alternative (an `$in` over every id in existence)
 * cannot be written down. See {@link interpolateConditions}.
 */
const UNRESTRICTED = Symbol('authz.unrestricted');

/**
 * Paths under `scope.` that must resolve to an array. Returning `undefined`
 * for these would produce `{ $in: undefined }`, which matches unpredictably;
 * an empty array matches nothing, which is the safe reading of "you hold no
 * teams / no grants".
 */
function resolveScopePath(segments: string[], context: AbilityContext): unknown {
  const scope = context.scope;
  const [head, ...rest] = segments;

  if (head === 'teamIds') return scope?.teamIds ?? [];
  if (head === 'organizationId') return scope?.organizationId ?? null;
  if (head === 'grants') {
    // `${scope.grants.Lead}` — a grant over one subject.
    const subjectName = rest[0];
    if (!subjectName) return [];
    const grant = scope?.grants?.[subjectName];
    if (grant === 'all') return UNRESTRICTED;
    return grant ?? [];
  }
  return undefined;
}

/** Resolve a dotted path (e.g. `user.id`, `scope.teamIds`) against the context. */
function resolvePath(path: string, context: AbilityContext): unknown {
  const segments = path.split('.');
  if (segments[0] === 'scope') return resolveScopePath(segments.slice(1), context);

  return segments.reduce<unknown>((acc, key) => {
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
): AbilityConditions | undefined {
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const match = value.match(PLACEHOLDER);
      return match ? resolvePath(match[1], context) : value;
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const entries: [string, unknown][] = [];
      for (const [key, raw] of Object.entries(source)) {
        const walked = walk(raw);
        // An unrestricted branch removes the constraint it belonged to.
        if (walked === UNRESTRICTED) continue;
        entries.push([key, walked]);
      }
      // Every branch dropped ⇒ this object no longer restricts anything.
      if (Object.keys(source).length > 0 && entries.length === 0) {
        return UNRESTRICTED;
      }
      return Object.fromEntries(entries);
    }
    return value;
  };

  const result = walk(conditions);
  if (result === UNRESTRICTED) return undefined;
  return result as AbilityConditions;
}

/**
 * Order rules so every `cannot` is applied after every `can`.
 *
 * CASL is last-rule-wins. A user holding several roles has their permissions
 * unioned in whatever order the database returned the roles, so without this a
 * deny in one role is silently overridden by a grant in another and the
 * effective ability depends on row order. Denies last makes "deny wins" a
 * property of the system rather than an accident. The split is stable, so
 * relative order within each group is preserved.
 */
function denyLast(permissions: readonly PermissionDefinition[]): PermissionDefinition[] {
  const allows: PermissionDefinition[] = [];
  const denies: PermissionDefinition[] = [];
  for (const permission of permissions) {
    (permission.inverted ? denies : allows).push(permission);
  }
  return [...allows, ...denies];
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

  for (const permission of denyLast(permissions)) {
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
 * Placeholder interpolated against the authenticated principal when the ability
 * is built (see {@link AbilityContext}) — it scopes a rule to the caller's own
 * resources.
 */
// biome-ignore lint/suspicious/noTemplateCurlyInString: this is a condition placeholder, not a template literal
const OWN_USER_ID = '${user.id}';

/**
 * Permissions granted to the seeded **system roles**. Used by the migration /
 * seed to provision `admin` and `user`, and as the fallback for the legacy
 * single-role column before a user is migrated to the join table.
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<string, PermissionDefinition[]> = {
  superadmin: [{ action: 'manage', subject: 'all' }],
  admin: [{ action: 'manage', subject: 'all' }],
  user: [
    { action: 'read', subject: 'User' },
    { action: 'update', subject: 'User' },
    { action: 'read', subject: 'Article' },
    { action: 'create', subject: 'Article' },
    // Every user manages their own API tokens; the condition keeps them off
    // everyone else's.
    {
      action: 'read',
      subject: 'ApiToken',
      conditions: { userId: OWN_USER_ID },
    },
    {
      action: 'create',
      subject: 'ApiToken',
      conditions: { userId: OWN_USER_ID },
    },
    {
      action: 'delete',
      subject: 'ApiToken',
      conditions: { userId: OWN_USER_ID },
    },
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
