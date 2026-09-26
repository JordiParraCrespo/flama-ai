import type { IncomingHttpHeaders } from 'node:http';
import { Injectable } from '@nestjs/common';
import { auth } from './better-auth.config';
import { betterAuthHeaders } from './better-auth.util';
import type { CredentialVerifierPort } from './credential-verifier.port';

/**
 * {@link CredentialVerifierPort} against Better Auth.
 *
 * The only place that names `auth.api.getSession` for a presented credential.
 * The call answers "not a session" by rejecting, which is not an error worth
 * propagating — a request may carry no session at all — so it is folded into
 * a `false` the caller can branch on.
 */
@Injectable()
export class BetterAuthCredentialVerifierAdapter implements CredentialVerifierPort {
  async hasValidSession(headers: IncomingHttpHeaders): Promise<boolean> {
    const session = await auth.api
      .getSession({ headers: betterAuthHeaders(headers) })
      .catch(() => null);
    return session !== null;
  }
}
