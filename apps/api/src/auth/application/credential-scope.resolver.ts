import { AppError } from '@flama/backend-core';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { CREDENTIAL_VERIFIER, SCOPED_CREDENTIAL } from '../auth.di-tokens';
import { CredentialErrors } from '../domain/auth.errors';
import type { ScopeContext, ScopedRequest } from '../domain/scope-context.types';
import type { CredentialVerifierPort } from '../infrastructure/credential-verifier.port';
import type { ScopedCredentialPort } from './scoped-credential.port';

/** Header carrying a scoped credential, for clients that prefer it over `Authorization`. */
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
 * - **Scoped credential** — whatever is bound to `SCOPED_CREDENTIAL`
 *   recognises, in `Authorization: Bearer` or `x-api-key`. It resolves the
 *   secret to the scopes and organizations that narrow it.
 *
 * A bearer credential that cannot be resolved is rejected rather than ignored:
 * silently falling back to a cookie would let a stale token act with the
 * browser session's full rights, which is precisely what scoping exists to
 * prevent.
 */
@Injectable()
export class CredentialScopeResolver {
  constructor(
    @Inject(CREDENTIAL_VERIFIER)
    private readonly credentials: CredentialVerifierPort,
    @Optional()
    @Inject(SCOPED_CREDENTIAL)
    private readonly scoped?: ScopedCredentialPort,
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

    if (this.scoped?.recognises(presented)) {
      return this.scoped.resolve(presented, request);
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

  /**
   * A bearer credential that is not a scoped one is only acceptable if the
   * provider recognises it as a session token — the mobile app and a CLI
   * sign-in authenticate that way, and carry no scopes. Anything else is
   * rejected rather than ignored, so a stale token can never fall through to a
   * cookie session's full rights.
   */
  private async rejectUnlessSession(request: ScopedRequest): Promise<null> {
    const recognised = await this.credentials.hasValidSession(request.headers);
    if (!recognised) throw new AppError(CredentialErrors.INVALID_CREDENTIAL);
    return null;
  }
}
