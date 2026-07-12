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
 * Low-level shaping helpers for the module mappers. Better Auth's `auth.api.*`
 * returns broad, strongly-typed objects; the mappers accept `unknown` and use
 * these to narrow once, so services never carry `as`-casts. Envelope helpers
 * unwrap Better Auth's `{ member }` / `{ members }` style responses.
 */
export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Unwrap a single-object envelope (e.g. `{ member: {...} }`); otherwise return the value itself. */
export function unwrap(value: unknown, key: string): unknown {
  const record = asRecord(value);
  return key in record ? record[key] : value;
}

/** Unwrap an array envelope (e.g. `{ members: [...] }`); otherwise coerce the value to an array. */
export function unwrapArray(value: unknown, key: string): unknown[] {
  const record = asRecord(value);
  return key in record ? asArray(record[key]) : asArray(value);
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
      // ({ message, code }); its public type doesn't surface them, so read them
      // through `asRecord`.
      const e = asRecord(err);
      const status = typeof e.statusCode === 'number' ? e.statusCode : 500;
      const body = asRecord(e.body);
      throw new HttpException(
        'message' in body ? body : { message: String(e.message ?? 'Request failed') },
        status,
      );
    }
    throw new InternalServerErrorException(
      err instanceof Error ? err.message : 'Better Auth request failed',
    );
  }
}
