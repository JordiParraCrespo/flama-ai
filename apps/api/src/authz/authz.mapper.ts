import { canGrant, type ResourceDefinition, type ResourceRegistry } from '@flama/backend-authz';
import type { AppAbility } from '@flama/shared';
import type {
  AuthzCatalogResponseDto,
  AuthzResourceDto,
  AuthzRuleDto,
} from './dtos/authz-catalog.response.dto';

/**
 * Registry declarations → the catalog wire shape.
 *
 * Kept pure and DI-free so it is trivially testable, per the mapper convention:
 * the query handler resolves the ability and delegates the shaping here.
 */
export function toResourceDto(resource: ResourceDefinition): AuthzResourceDto {
  return {
    subject: resource.subject,
    label: resource.label,
    group: resource.group,
    actions: resource.actions.map((action) => ({
      name: action.name,
      ...(action.label ? { label: action.label } : {}),
      ...(action.sensitive !== undefined ? { sensitive: action.sensitive } : {}),
    })),
    ...(resource.fields ? { fields: [...resource.fields] } : {}),
    scopes: [...resource.scopes],
    ...(resource.credentialScope ? { credentialScope: resource.credentialScope } : {}),
  };
}

export function toCatalogResponse(
  registry: ResourceRegistry,
  ability: AppAbility,
): AuthzCatalogResponseDto {
  const groups = registry.byGroup().map((group) => ({
    group: group.group,
    resources: group.resources.map(toResourceDto),
  }));

  // The same containment rule the write path enforces, evaluated up front so
  // the role builder can disable what would be rejected rather than surfacing
  // the rejection after the fact.
  const grantable: AuthzRuleDto[] = registry
    .knownRules()
    .filter((rule) => canGrant(ability, [rule]))
    .map((rule) => ({ action: rule.action, subject: rule.subject }));

  return { groups, grantable };
}
