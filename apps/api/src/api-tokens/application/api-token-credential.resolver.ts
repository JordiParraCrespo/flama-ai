import { AppError } from '@flama/backend-core';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ScopedCredentialPort } from '../../auth/application/scoped-credential.port';
import { CredentialErrors } from '../../auth/domain/auth.errors';
import type {
  CredentialOwner,
  ScopeContext,
  ScopedRequest,
} from '../../auth/domain/scope-context.types';
import type { UserRepositoryPort } from '../../users/database/user.repository.port';
import { USER_REPOSITORY } from '../../users/user.di-tokens';
import { API_TOKEN_REPOSITORY } from '../api-tokens.di-tokens';
import type { ApiTokenRepositoryPort } from '../database/api-token.repository.port';
import { ApiTokenErrors } from '../domain/api-token.errors';
import { hashApiTokenSecret, isApiTokenSecret } from '../domain/api-token-secret.factory';

/**
 * API tokens as the API's scoped credential: a `flama_pat_…` secret is looked
 * up by digest and checked for revocation, expiry and source IP, and its
 * owner is loaded as they are right now.
 */
@Injectable()
export class ApiTokenCredentialResolver implements ScopedCredentialPort {
  private readonly logger = new Logger(ApiTokenCredentialResolver.name);

  constructor(
    @Inject(API_TOKEN_REPOSITORY)
    private readonly apiTokens: ApiTokenRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepositoryPort,
  ) {}

  recognises(secret: string): boolean {
    return isApiTokenSecret(secret);
  }

  async resolve(secret: string, request: ScopedRequest): Promise<ScopeContext> {
    const found = await this.apiTokens.findOneByHash(hashApiTokenSecret(secret));
    if (found.isNone()) throw new AppError(CredentialErrors.INVALID_CREDENTIAL);

    const token = found.unwrap();
    const rejection = token.rejectionReason({
      now: new Date(),
      ipAddress: sourceAddress(request),
    });

    if (rejection === 'ip-not-allowed') throw new AppError(ApiTokenErrors.IP_NOT_ALLOWED);
    // Revoked and expired share the credential error: distinguishing them
    // would tell an attacker which of their guesses used to be real.
    if (rejection) throw new AppError(CredentialErrors.INVALID_CREDENTIAL);

    // Best-effort usage stamp — never let it fail the request.
    void this.apiTokens
      .touchLastUsedAt(token.id, new Date())
      .catch((error) => this.logger.warn(`Could not record token usage: ${describe(error)}`));

    return {
      kind: 'api-token',
      credentialId: token.id,
      userId: token.userId,
      owner: await this.loadOwner(token.userId),
      scopes: token.scopes,
      resourceScope: token.resourceScope,
      expiresAt: token.expiresAt,
      prefix: token.prefix,
    };
  }

  /**
   * The credential's owner, as they exist right now. A missing or deactivated
   * owner invalidates every credential they issued — the same opaque error as
   * an unknown token, so the two are indistinguishable from outside.
   */
  private async loadOwner(userId: string): Promise<CredentialOwner> {
    const found = await this.users.findOneById(userId);
    if (found.isNone()) throw new AppError(CredentialErrors.INVALID_CREDENTIAL);

    const owner = found.unwrap();
    if (!owner.isActive) throw new AppError(CredentialErrors.INVALID_CREDENTIAL);

    return {
      id: owner.id,
      email: owner.email,
      firstName: owner.firstName,
      lastName: owner.lastName,
      role: owner.role,
      isActive: owner.isActive,
      emailVerified: owner.emailVerified,
    };
  }
}

/**
 * The request's source address. Behind a proxy this is the proxy's address
 * unless Express is configured with `trust proxy`, so an IP allowlist should
 * only be relied on once that is set (see the API tokens documentation).
 */
function sourceAddress(request: ScopedRequest): string | null {
  return request.ip ?? request.socket?.remoteAddress ?? null;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
