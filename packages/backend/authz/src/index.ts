export { canAccessRow } from './ability/can-access-row';
export { AuthzModule } from './authz.module';
export {
  canGrant,
  describePermission,
  ungrantablePermissions,
} from './grants/can-grant';
export { type AccessGrantInput, canGrantScope } from './grants/can-grant-scope';
export {
  AUTHORIZE_RESOURCE_KEY,
  AuthorizeResource,
  type AuthorizeResourceOptions,
  CHECK_POLICIES_KEY,
  CheckPolicies,
  NO_POLICY_KEY,
  NoPolicy,
  PLATFORM_ADMIN_KEY,
  PlatformAdmin,
  type PolicyRule,
} from './guards/decorators';
export {
  defineResource,
  type ResourceActionDefinition,
  type ResourceDefinition,
  type ResourceKeys,
  type ScopeDimension,
} from './registry/resource-definition';
export {
  type ResourceGroup,
  ResourceRegistry,
} from './registry/resource-registry';
export {
  type AccessScope,
  emptyScope,
  toAbilityScopeContext,
} from './scope/access-scope';
export { applyAccessScope } from './scope/apply-access-scope';
export {
  type ResolveScopeInput,
  SCOPE_RESOLVER,
  type ScopeResolverPort,
} from './scope/scope-resolver.port';
export { ScopedRepositoryBase } from './scope/scoped-repository.base';
export {
  AbilityAssertions,
  type ExpectAbilityContext,
  expectAbility,
} from './testing/expect-ability';
