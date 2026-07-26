import type { Scope } from '@flama/shared';

/** Shape of the API's structured error body (`AllExceptionsFilter`). */
interface ApiErrorBody {
  code?: string;
  message?: string;
  correlationId?: string;
}

/**
 * An API call that failed. Carries the HTTP status and the API's error code so
 * tools can turn it into a message an agent can act on rather than a stack
 * trace.
 */
export class FlamaApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
    readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'FlamaApiError';
  }

  /** Whether the call failed because the credential is missing a permission. */
  get isPermissionError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export interface CurrentCredential {
  kind: 'session' | 'api-token' | 'oauth';
  userId: string;
  email: string;
  grantedScopes: Scope[] | null;
  effectiveScopes: Scope[];
  organizationIds: string[] | null;
  expiresAt: string | null;
}

export interface FlamaClientOptions {
  apiUrl: string;
  /** Credential presented on every request, as `Authorization: Bearer …`. */
  token: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Minimal typed client for the Flama REST API.
 *
 * Deliberately hand-rolled rather than generated: the MCP server needs to run
 * as a standalone binary against any Flama deployment, so it depends on the
 * HTTP contract, not on a build artifact of the API it is talking to.
 */
export class FlamaClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FlamaClientOptions) {
    this.baseUrl = `${options.apiUrl.replace(/\/+$/, '')}/api/v1`;
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** What this credential is and what it can actually do. */
  currentCredential(): Promise<CurrentCredential> {
    return this.request<CurrentCredential>('GET', '/me/credential');
  }

  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url.toString(), {
        method,
        headers: {
          authorization: `Bearer ${this.token}`,
          accept: 'application/json',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 204) return undefined as T;

      const text = await response.text();
      const payload = text ? safeParse(text) : undefined;

      if (!response.ok) {
        const error = (payload ?? {}) as ApiErrorBody;
        throw new FlamaApiError(
          response.status,
          error.code,
          error.message ?? `${method} ${path} failed with ${response.status}`,
          error.correlationId,
        );
      }

      return payload as T;
    } catch (error) {
      if (error instanceof FlamaApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new FlamaApiError(504, 'MCP_TIMEOUT', `${method} ${path} timed out`);
      }
      throw new FlamaApiError(
        503,
        'MCP_UNREACHABLE',
        `Could not reach the Flama API at ${this.baseUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
