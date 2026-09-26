import type { IncomingHttpHeaders } from 'node:http';
import { Injectable, Logger, type Provider } from '@nestjs/common';
import { OAUTH_GRANT_VERIFIER } from '../auth.di-tokens';
import { auth } from './better-auth.config';
import { betterAuthHeaders } from './better-auth.util';
import type { OAuthGrantVerifierPort, VerifiedOAuthGrant } from './oauth-grant-verifier.port';

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * {@link OAuthGrantVerifierPort} against Better Auth's MCP plugin.
 *
 * The only place that names `auth.api.getMcpSession`. It answers "not an OAuth
 * grant" by rejecting, which is not an error worth propagating — a request may
 * carry no grant at all — so it is folded into a `null` the caller can branch
 * on.
 */
@Injectable()
export class McpOAuthGrantVerifierAdapter implements OAuthGrantVerifierPort {
  private readonly logger = new Logger(McpOAuthGrantVerifierAdapter.name);

  async verify(headers: IncomingHttpHeaders): Promise<VerifiedOAuthGrant | null> {
    const session = await auth.api
      .getMcpSession({ headers: betterAuthHeaders(headers) })
      .catch((error: unknown) => {
        this.logger.debug(`OAuth token verification failed: ${describe(error)}`);
        return null;
      });

    if (!session?.userId) return null;

    return {
      userId: session.userId,
      accessToken: session.accessToken,
      scopes: session.scopes,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
    };
  }
}

/**
 * The binding `AuthModule` registers, so the adapter answers the port's token
 * wherever `CredentialScopeResolver` asks.
 */
export const OAUTH_GRANT_VERIFIER_PROVIDER: Provider = {
  provide: OAUTH_GRANT_VERIFIER,
  useClass: McpOAuthGrantVerifierAdapter,
};
