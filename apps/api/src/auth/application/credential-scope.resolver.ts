import { AppError } from '@flama/backend-core';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { API_TOKEN_REPOSITORY } from '../../api-tokens/api-tokens.di-tokens';
import type { ApiTokenRepositoryPort } from '../../api-tokens/database/api-token.repository.port';
import { ApiTokenErrors } from '../../api-tokens/domain/api-token.errors';
import {
  hashApiTokenSecret,
  isApiTokenSecret,
} from '../../api-tokens/domain/api-token-secret.factory';
import type { UserRepositoryPort } from '../../users/database/user.repository.port';
import { USER_REPOSITORY } from '../../users/user.di-tokens';
import { CREDENTIAL_VERIFIER } from '../auth.di-tokens';
import type { CredentialOwner, ScopeContext, ScopedRequest } from '../domain/scope-context.types';
import type { CredentialVerifierPort } from '../infrastructure/credential-verifier.port';

/** Header carrying an API token, for clients that prefer it over `Authorization`. */
const API_KEY_HEADER = 'x-api-key';

/** Memoizes resolution so the guards can each ask without a second lookup. */
const RESOLUTION = Symbol('flama.credentialResolution');

interface WithResolution {
  [RESOLUTION]?: Promise<ScopeContext | null>;
}

/**
 * Turns the credential on a request into a {@link ScopeContext}.
 *
 * Two kinds of credential reach the API:
 *
 * - **Session** — a browser cookie, or the session token the mobile app and
 *   a CLI sign-in present as a bearer credential. No scope context; the
 *   user's roles govern.
 * - **API token** (`flama_pat_…`, in `Authorization: Bearer` or `x-api-key`)
 *   — looked up by digest, checked for revocation, expiry and source IP.
 *
 * A bearer credential that cannot be resolved is rejected rather than ignored:
 * silently falling back to a cookie would let a stale token act with the
 * browser session's full rights, which is precisely what scoping exists to
 * prevent.
 */
@Injectable()
export class CredentialScopeResolver {
  private readonly logger = new Logger(CredentialScopeResolver.name);

  constructor(
    @Inject(API_TOKEN_REPOSITORY)
    private readonly apiTokens: ApiTokenRepositoryPort,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepositoryPort,
    @Inject(CREDENTIAL_VERIFIER)
    private readonly credentials: CredentialVerifierPort,
  ) {}

  /** Resolve (once per request) the scoped credential, or `null` for a session. */
  resolve(request: ScopedRequest): Promise<ScopeContext | null> {
    const carrier = request as ScopedRequest & WithResolution;
    carrier[RESOLUTION] ??= this.doResolve(request);
    return carrier[RESOLUTION];
  }

  private async doResolve(request: ScopedRequest): Promise<ScopeContext | null> {
    const presented = this.extractCredential(request);
    if (!presented) return null;

    if (isApiTokenSecret(presented)) {
      return this.resolveApiToken(presented, request);
    }
    return this.rejectUnlessSession(request);
  }

  /** The raw credential string, from either supported header. */
  private extractCredential(request: ScopedRequest): string | null {
    const apiKeyHeader = request.headers[API_KEY_HEADER];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    if (apiKey?.trim()) return apiKey.trim();

    const authorization = request.headers.authorization;
    if (!authorization) return null;

    const [scheme, ...rest] = authorization.split(' ');
    if (scheme.toLowerCase() !== 'bearer') return null;

    const value = rest.join(' ').trim();
    return value || null;
  }

  private async resolveApiToken(secret: string, request: ScopedRequest): Promise<ScopeContext> {
    const found = await this.apiTokens.findOneByHash(hashApiTokenSecret(secret));
    if (found.isNone()) throw new AppError(ApiTokenErrors.INVALID_CREDENTIAL);

    const token = found.unwrap();
    const rejection = token.rejectionReason({
      now: new Date(),
      ipAddress: sourceAddress(request),
    });

    if (rejection === 'ip-not-allowed') throw new AppError(ApiTokenErrors.IP_NOT_ALLOWED);
    // Revoked and expired share the credential error: distinguishing them
    // would tell an attacker which of their guesses used to be real.
    if (rejection) throw new AppError(ApiTokenErrors.INVALID_CREDENTIAL);

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
   * A bearer credential that is not an API token is only acceptable if the
   * provider recognises it as a session token — the mobile app and a CLI
   * sign-in authenticate that way, and carry no scopes. Anything else is
   * rejected rather than ignored, so a stale token can never fall through to a
   * cookie session's full rights.
   */
  private async rejectUnlessSession(request: ScopedRequest): Promise<null> {
    const recognised = await this.credentials.hasValidSession(request.headers);
    if (!recognised) throw new AppError(ApiTokenErrors.INVALID_CREDENTIAL);
    return null;
  }

  /**
   * The credential's owner, as they exist right now. A missing or deactivated
   * owner invalidates every credential they issued — the same opaque error as
   * an unknown token, so the two are indistinguishable from outside.
   */
  private async loadOwner(userId: string): Promise<CredentialOwner> {
    const found = await this.users.findOneById(userId);
    if (found.isNone()) throw new AppError(ApiTokenErrors.INVALID_CREDENTIAL);

    const owner = found.unwrap();
    if (!owner.isActive) throw new AppError(ApiTokenErrors.INVALID_CREDENTIAL);

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
