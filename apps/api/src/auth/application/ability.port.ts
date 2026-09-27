import type { AppAbility, PermissionDefinition } from '@flama/shared';

/**
 * The principal an ability is built for — the members the builder reads.
 *
 * `id` selects the `user_role` assignments and is what `${user.id}` in a
 * permission condition resolves to; `role` is Better Auth's platform-role
 * column (several names, comma-separated), unioned in so an admin-plugin
 * promotion takes effect. Nothing else on the user record reaches the ability.
 */
export interface AbilityPrincipal {
  id: string;
  role?: string | null;
}

/**
 * Request-scoped context an ability is built in, used to interpolate
 * `${activeOrganizationId}` / `${activeTeamId}` in permission conditions and to
 * narrow role assignments to one organization.
 */
export interface AbilityScope {
  activeOrganizationId?: string | null;
  activeTeamId?: string | null;
}

/** The members of the caller's session the builder reads. */
export type AbilitySession = AbilityScope;

/**
 * Where {@link AbilityPort.forRequest} memoizes: one ability per resolved
 * organization (`''` for none), for the lifetime of one request.
 */
export const ABILITY_MEMO = Symbol('ability.memo');

export type AbilityMemo = Map<string, AppAbility>;

/**
 * What {@link AbilityPort.forRequest} is handed: the principal, its session,
 * and the request's memo. Callers build it from the HTTP request with
 * {@link abilityRequestOf} rather than passing the request itself.
 */
export interface AbilityRequest {
  user: AbilityPrincipal;
  session?: AbilitySession | null;
  [ABILITY_MEMO]?: AbilityMemo;
}

/**
 * The HTTP request as far as the ability is concerned: its principal and
 * session as the auth guard left them, the memo slot, and the ability
 * `PoliciesGuard` attaches for handlers that check a loaded row.
 */
export interface AbilityHttpRequest {
  user?: AbilityPrincipal | null;
  session?: AbilitySession | null;
  [ABILITY_MEMO]?: AbilityMemo;
  ability?: AppAbility;
}

/**
 * The {@link AbilityRequest} for an authenticated HTTP request: `{ user,
 * session }` plus the memo, which lives on the request so every caller in it
 * shares one. Returns `null` when the request carries no principal.
 */
export function abilityRequestOf(request: AbilityHttpRequest): AbilityRequest | null {
  if (!request.user) return null;
  request[ABILITY_MEMO] ??= new Map();
  return {
    user: request.user,
    session: request.session ?? null,
    [ABILITY_MEMO]: request[ABILITY_MEMO],
  };
}

/**
 * The caller's effective CASL ability.
 *
 * `PoliciesGuard` is the kernel's inbound adapter for "may this person do it",
 * but *what* a person may do is the roles module's answer, built from the
 * roles assigned to them. Everything outside `roles` asks through this port
 * (the `ABILITY` token), so no module names the adapter; `roles` binds
 * its `AbilityFactory` here and remains the one place an ability is built.
 */
export interface AbilityPort {
  /**
   * The ability for this request, memoized on it per resolved organization.
   *
   * The organization is `organizationId` when the caller names one (the route's
   * `@OrganizationScoped` parameter, or an `X-Active-Organization` the caller
   * validated), else the session's active organization. Two callers that
   * resolve different organizations get different abilities; neither can be
   * handed the other's.
   */
  forRequest(request: AbilityRequest, organizationId?: string | null): Promise<AppAbility>;

  /** The ability for a principal outside a request's memo (a command, a query). */
  createForUser(user: AbilityPrincipal, scope?: AbilityScope): Promise<AppAbility>;

  /**
   * The raw permission definitions {@link createForUser} builds from, so a
   * client can rebuild the ability itself.
   */
  permissionsForUser(user: AbilityPrincipal, scope?: AbilityScope): Promise<PermissionDefinition[]>;
}
