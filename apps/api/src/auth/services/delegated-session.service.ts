import { CacheService } from '@flama/backend-cache';
import { Injectable, Logger } from '@nestjs/common';
import { auth } from '../auth';

/** How long a delegated session lives before it must be re-minted. */
const SESSION_TTL_SECONDS = 10 * 60;

/** Cache entries expire a little early so a cached token is never past its use. */
const CACHE_TTL_SECONDS = SESSION_TTL_SECONDS - 60;

/**
 * Bridges scoped credentials to the Better Auth session world.
 *
 * Several modules (organizations, members, invitations, workspaces, admin) are
 * façades over Better Auth's server API, which resolves the caller from their
 * session. An API token or OAuth access token carries no such session, so this
 * service mints a short-lived one for the credential's owner and hands back its
 * token; the auth guard then presents it as `Authorization: Bearer <token>`,
 * which the Better Auth `bearer` plugin accepts.
 *
 * Sessions are cached per credential so a busy token creates one session every
 * ten minutes rather than one per request, and they are tagged with the
 * credential's prefix so they are recognisable in a user's session list (and
 * revocable from it).
 */
@Injectable()
export class DelegatedSessionService {
  private readonly logger = new Logger(DelegatedSessionService.name);

  constructor(private readonly cache: CacheService) {}

  /**
   * A Better Auth session token acting as `userId`, reused across requests
   * from the same credential. Returns `null` if a session could not be minted
   * — callers fall back to scope-only access rather than failing the request,
   * since most routes never touch the Better Auth API.
   */
  async resolveSessionToken(options: {
    credentialId: string;
    userId: string;
    label: string;
    /** Set as the session's active organization, when the credential pins one. */
    activeOrganizationId?: string | null;
  }): Promise<string | null> {
    const key = this.cacheKey(options.credentialId);

    try {
      const cached = await this.cache.get<string>(key);
      if (cached) return cached;
    } catch (error) {
      // A cache outage must not take the API down; fall through and mint.
      this.logger.warn(`Delegated session cache read failed: ${describe(error)}`);
    }

    try {
      const context = await auth.$context;
      const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
      const session = await context.internalAdapter.createSession(options.userId, true, {
        expiresAt,
        userAgent: options.label,
        ...(options.activeOrganizationId
          ? { activeOrganizationId: options.activeOrganizationId }
          : {}),
      });

      await this.cache
        .set(key, session.token, CACHE_TTL_SECONDS)
        .catch((error) =>
          this.logger.warn(`Delegated session cache write failed: ${describe(error)}`),
        );

      return session.token;
    } catch (error) {
      this.logger.error(`Could not mint a delegated session: ${describe(error)}`);
      return null;
    }
  }

  /** Drop the cached session for a credential (used when it is revoked). */
  async invalidate(credentialId: string): Promise<void> {
    await this.cache
      .del(this.cacheKey(credentialId))
      .catch((error) => this.logger.warn(`Delegated session eviction failed: ${describe(error)}`));
  }

  private cacheKey(credentialId: string): string {
    return `delegated-session:${credentialId}`;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
