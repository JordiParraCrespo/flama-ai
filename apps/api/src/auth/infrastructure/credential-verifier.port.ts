import type { IncomingHttpHeaders } from 'node:http';

/**
 * Verifies a credential a request presents, against whoever issues them.
 *
 * This is the seam the rest of the application asks "is this real, and whose
 * is it?" through. The identity provider's method names, its header shape and
 * its error vocabulary stop here: `CredentialScopeResolver` composes the
 * answers into a scope context and never learns which provider gave them.
 */
export interface CredentialVerifierPort {
  /**
   * Whether these headers carry a session the provider recognises.
   *
   * A bearer credential that is not an API token is only acceptable if it is
   * a session token — that is how the mobile app and the CLI's sign-in flow
   * authenticate.
   */
  hasValidSession(headers: IncomingHttpHeaders): Promise<boolean>;
}
