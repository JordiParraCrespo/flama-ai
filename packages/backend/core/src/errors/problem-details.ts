import { STATUS_CODES } from 'node:http';
import {
  DEFAULT_PROBLEM_TYPE,
  type InvalidParam,
  isProblemDetails,
  PROBLEM_JSON_CONTENT_TYPE,
  type ProblemDetails,
} from '@flama/shared';

export {
  DEFAULT_PROBLEM_TYPE,
  type InvalidParam,
  isProblemDetails,
  PROBLEM_JSON_CONTENT_TYPE,
  type ProblemDetails,
};

/**
 * Where error-type URIs point when nothing else is configured. Deployments
 * override it with `ERROR_TYPE_BASE_URL` so a fork documents its own catalog.
 */
export const DEFAULT_ERROR_TYPE_BASE_URL = 'https://flama.dev/errors';

/**
 * The RFC 7807 `type` for a catalog error code.
 *
 * Codes become fragments on a single reference page (`…/errors#user_001`)
 * rather than one URL per code, so every type URI actually resolves to the
 * paragraph describing it — RFC 7807 §3.1 asks that the type be
 * dereferenceable to human-readable documentation.
 */
export function problemTypeFor(code: string, baseUrl = DEFAULT_ERROR_TYPE_BASE_URL): string {
  const slug = code.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `${baseUrl.replace(/[#/]+$/, '')}#${slug}`;
}

/**
 * Human-readable summary for a bare status code, used as the `title` of
 * problems that have no catalog entry (RFC 7807 §4.2 — `about:blank` problems
 * whose title is the status phrase).
 */
export function titleForStatus(status: number): string {
  return STATUS_CODES[status] ?? 'Error';
}

/** Members every problem document carries beyond the ones the caller supplies. */
export interface ProblemContext {
  /** Request path, recorded as the problem's `instance`. */
  instance?: string;
  correlationId?: string;
  timestamp?: string;
}

/**
 * Assembles a problem document, dropping empty members so the response stays
 * the minimum RFC 7807 requires plus whatever we actually know.
 */
export function buildProblemDetails(
  problem: Partial<ProblemDetails> & { status: number },
  context: ProblemContext = {},
): ProblemDetails {
  const { status, type, title, detail, invalidParams, ...extensions } = problem;

  return {
    type: type ?? DEFAULT_PROBLEM_TYPE,
    title: title ?? titleForStatus(status),
    status,
    ...(detail ? { detail } : {}),
    ...(context.instance ? { instance: context.instance } : {}),
    ...(invalidParams?.length ? { invalidParams } : {}),
    ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    timestamp: context.timestamp ?? new Date().toISOString(),
    ...extensions,
  };
}
