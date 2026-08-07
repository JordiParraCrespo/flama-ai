/**
 * DI tokens for the domains module. Repositories are injected through tokens so
 * application code depends on the port abstractions, not the TypeORM adapters.
 */
export const DOMAIN_REPOSITORY = Symbol('DOMAIN_REPOSITORY');
export const USER_DOMAIN_ACCESS_REPOSITORY = Symbol('USER_DOMAIN_ACCESS_REPOSITORY');
export const ORGANIZATION_MEMBERSHIP_REPOSITORY = Symbol('ORGANIZATION_MEMBERSHIP_REPOSITORY');
