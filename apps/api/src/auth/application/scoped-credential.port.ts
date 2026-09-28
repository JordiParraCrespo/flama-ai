import type { ScopeContext, ScopedRequest } from '../domain/scope-context.types';

/**
 * A kind of scoped credential the API accepts, beside sessions: a secret a
 * client presents as a bearer credential (or in `x-api-key`) that narrows what
 * its owner may do. {@link CredentialScopeResolver} asks the one bound here
 * before treating a bearer credential as a session token.
 *
 * Nothing is bound in a project without one, and every bearer credential is
 * then a session token or nothing.
 */
export interface ScopedCredentialPort {
  /** Is this secret one of ours? A cheap shape check, with no lookup. */
  recognises(secret: string): boolean;

  /**
   * The scope context this secret grants. Throws `AppError` for a secret that
   * is unknown, revoked, expired or used from somewhere it may not be.
   */
  resolve(secret: string, request: ScopedRequest): Promise<ScopeContext>;
}
