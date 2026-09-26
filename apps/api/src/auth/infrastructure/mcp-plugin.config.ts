import { DEFAULT_OAUTH_SCOPES, SCOPES } from '@flama/shared';
import { mcp } from 'better-auth/plugins';

/** Every scope a client may ask for: the OIDC standard ones, then the catalog. */
const OAUTH_SCOPES_SUPPORTED = ['openid', 'profile', 'email', 'offline_access', ...SCOPES];

/**
 * Better Auth's MCP plugin as Flama configures it: the API as an OAuth 2.1
 * provider for MCP clients — discovery metadata, dynamic client registration,
 * authorization and token endpoints. Clients ask for scopes from the shared
 * catalog and the user approves (or narrows) them on the consent screen. Its
 * own file so a project without the MCP server drops it whole, and
 * `better-auth.config.ts` keeps one fenced line where it used to hold it.
 */
export function mcpPlugin(frontendUrl: string) {
  return mcp({
    loginPage: `${frontendUrl}/login`,
    // The plugin hands *these* options — not `oidcConfig` — to the discovery
    // metadata builder, which otherwise advertises only the OIDC standard
    // scopes. Publishing the catalog here is what lets an MCP client see
    // which permissions this deployment actually offers.
    ...({ metadata: { scopes_supported: OAUTH_SCOPES_SUPPORTED } } as object),
    oidcConfig: {
      loginPage: `${frontendUrl}/login`,
      scopes: [...SCOPES],
      defaultScope: DEFAULT_OAUTH_SCOPES.join(' '),
      consentPage: `${frontendUrl}/oauth/consent`,
      // MCP clients are public clients that register themselves on first use.
      allowDynamicClientRegistration: true,
      requirePKCE: true,
      storeClientSecret: 'hashed',
      accessTokenExpiresIn: 60 * 60,
      refreshTokenExpiresIn: 60 * 60 * 24 * 30,
      // Mirrored here for the OIDC discovery document, which is built from
      // `oidcConfig` rather than the plugin options above.
      metadata: { scopes_supported: OAUTH_SCOPES_SUPPORTED },
    },
  });
}
