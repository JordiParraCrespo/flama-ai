/**
 * DI tokens for the access-control module. Repositories are injected through
 * tokens so application code depends on the port abstractions, not the TypeORM
 * adapters.
 */
export const RESOURCE_ACCESS_REPOSITORY = Symbol('RESOURCE_ACCESS_REPOSITORY');
export const ORGANIZATION_MEMBERSHIP_REPOSITORY = Symbol('ORGANIZATION_MEMBERSHIP_REPOSITORY');
