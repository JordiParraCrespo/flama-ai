/**
 * DI tokens for the domains module. The repository is injected through a token
 * so application code depends on the `DomainRepositoryPort` abstraction, not
 * the concrete TypeORM adapter.
 *
 * Per-instance domain access has no token here: it is generic and served by
 * `access-control/` (`ResourceAccessService`).
 */
export const DOMAIN_REPOSITORY = Symbol('DOMAIN_REPOSITORY');
