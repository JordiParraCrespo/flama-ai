import type { IncomingHttpHeaders } from 'node:http';

/** An OAuth access grant the identity provider recognised. */
export interface VerifiedOAuthGrant {
  userId: string;
  /** The raw access token, for deriving a stable credential id by digest. */
  accessToken: string;
  /** Space-delimited scope string as granted at consent. */
  scopes: string | null | undefined;
  accessTokenExpiresAt: Date | string | null | undefined;
}

/**
 * Verifies an OAuth access token a request presents.
 *
 * Only a deployment that is an OAuth provider binds this — the MCP server's,
 * which lets MCP clients register and ask for scopes. Without it no OAuth
 * grant exists to verify, and `CredentialScopeResolver` treats every bearer
 * credential that is not an API token as a session token.
 */
export interface OAuthGrantVerifierPort {
  /** The OAuth grant these headers carry, or `null` if they carry none. */
  verify(headers: IncomingHttpHeaders): Promise<VerifiedOAuthGrant | null>;
}
