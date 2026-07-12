import type { IncomingHttpHeaders } from 'node:http';
import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { APIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';

/**
 * Helpers for the delegating façade modules (organizations, invitations,
 * workspaces, admin) that expose Better Auth plugin operations as first-class
 * NestJS REST endpoints. The modules call `auth.api.*` server methods rather
 * than re-implementing writes to the Better-Auth-owned tables.
 */

/** Convert incoming Express request headers into the `Headers` object the Better Auth server API expects (for session resolution). */
export function betterAuthHeaders(headers: IncomingHttpHeaders): Headers {
  return fromNodeHeaders(headers);
}

/**
 * Run a Better Auth server-API call, translating its `APIError` into the
 * matching NestJS `HttpException` so the global exception filter renders a clean
 * response (e.g. slug-taken → 409, not-a-member → 403).
 */
export async function invokeBetterAuth<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof APIError) {
      // Better Auth's APIError carries an HTTP `statusCode` and a `body`
      // ({ message, code }); its public type doesn't surface them, so read
      // structurally.
      const e = err as unknown as {
        statusCode?: number;
        body?: Record<string, unknown>;
        message?: string;
      };
      const status = typeof e.statusCode === 'number' ? e.statusCode : 500;
      throw new HttpException(e.body ?? { message: e.message ?? 'Request failed' }, status);
    }
    throw new InternalServerErrorException(
      err instanceof Error ? err.message : 'Better Auth request failed',
    );
  }
}
