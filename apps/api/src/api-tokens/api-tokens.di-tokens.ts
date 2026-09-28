/**
 * DI tokens for the API tokens module. Repositories are injected through
 * tokens so application code depends on the port abstractions, not the
 * concrete TypeORM adapters.
 */
export const API_TOKEN_REPOSITORY = Symbol('API_TOKEN_REPOSITORY');
