import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { RestrictableResource } from '../../access-control/services/restrictable-resource.registry';
import { RestrictableResourceRegistry } from '../../access-control/services/restrictable-resource.registry';

/** Stored in `user_resource_access.resourceType`; renaming it is a data migration. */
export const DOMAIN_RESOURCE_TYPE = 'domain';

/**
 * Registers domains as a resource a user can be restricted to a subset of —
 * the enforcement half of the design's "All domains" vs "3 domains" member
 * column.
 *
 * This is the entire domain-side cost of per-instance access. Storage, the CASL
 * narrowing and the listing filter are generic and live in `access-control/`.
 */
export const DOMAIN_RESTRICTABLE_RESOURCE: RestrictableResource = {
  type: DOMAIN_RESOURCE_TYPE,
  // `Domain` is keyed by its own `id`. Resources captured on a domain carry a
  // `domainId`, so restricting someone to three domains keeps them out of the
  // other domains' leads and reports too — add those subjects here as their
  // modules land, rather than growing a second enforcement path.
  scopedSubjects: [{ subject: 'Domain', field: 'id' }],
};

@Injectable()
export class DomainRestrictableResourceRegistrar implements OnModuleInit {
  constructor(private readonly registry: RestrictableResourceRegistry) {}

  onModuleInit(): void {
    this.registry.register(DOMAIN_RESTRICTABLE_RESOURCE);
  }
}
