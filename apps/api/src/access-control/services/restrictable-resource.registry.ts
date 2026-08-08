import { Injectable, Logger } from '@nestjs/common';

/**
 * Declares a resource type that a user can be restricted to a subset of.
 *
 * A feature module registers one of these; everything else — storage, the CASL
 * rules, the query filter — is generic. Adding per-instance access to a new
 * resource is a registration, not a new table and a new contributor.
 */
export interface RestrictableResource {
  /**
   * Stable key persisted in `user_resource_access.resourceType`. Renaming it is
   * a data migration, so pick a durable noun (`domain`, `lead`, `campaign`).
   */
  type: string;

  /**
   * CASL subjects a restriction on this type narrows, and the field on each
   * that carries the restricted id.
   *
   * Usually more than one: restricting someone to three domains should also
   * keep them out of the leads and reports belonging to every other domain, and
   * those subjects reference it as `domainId` rather than `id`.
   */
  scopedSubjects: ReadonlyArray<{ subject: string; field: string }>;
}

/**
 * Holds the registered {@link RestrictableResource}s.
 *
 * Feature modules register from their own `onModuleInit`, which keeps the
 * dependency pointing feature-module → access-control and never back.
 */
@Injectable()
export class RestrictableResourceRegistry {
  private readonly logger = new Logger(RestrictableResourceRegistry.name);
  private readonly byType = new Map<string, RestrictableResource>();

  register(resource: RestrictableResource): void {
    const existing = this.byType.get(resource.type);
    if (existing && existing !== resource) {
      // Two modules claiming one key would make stored rows ambiguous, and the
      // winner would depend on module init order.
      throw new Error(
        `Restrictable resource type "${resource.type}" is already registered by another module`,
      );
    }
    this.byType.set(resource.type, resource);
  }

  get(type: string): RestrictableResource | undefined {
    return this.byType.get(type);
  }

  /**
   * Resource for a stored row's `resourceType`, or `undefined` if nothing
   * registered it.
   *
   * An unregistered type means the owning module is not loaded, so no route
   * serves its subjects and there is nothing for a rule to protect — skipping is
   * safe rather than a silent widening. It is still logged, because in a normal
   * deployment it means rows outlived their module.
   */
  resolve(type: string): RestrictableResource | undefined {
    const resource = this.byType.get(type);
    if (!resource) {
      this.logger.warn({
        message: 'Ignoring access restriction for an unregistered resource type',
        resourceType: type,
      });
    }
    return resource;
  }
}
