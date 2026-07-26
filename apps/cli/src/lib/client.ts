import { CliError, ExitCode } from './errors';

export interface ApiClientOptions {
  apiUrl: string;
  /** Bearer credential. Omitted for the sign-in call itself. */
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
  /** Extra headers, used by the sign-in flow. */
  headers?: Record<string, string>;
  /** Called with the response headers — how sign-in picks up its token. */
  onHeaders?: (headers: Headers) => void;
  /** Skip the `/api/v1` prefix (for Better Auth's `/api/auth/*` routes). */
  absolute?: boolean;
}

/**
 * HTTP client for the Flama API.
 *
 * Failures are translated into {@link CliError}s carrying the exit code that
 * matches what went wrong, so every command reports authentication,
 * permission and not-found failures consistently without repeating itself.
 */
export class ApiClient {
  private readonly apiUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, options);
  }

  patch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', path, options);
  }

  put<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, options);
  }

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  private async request<T>(method: string, path: string, options: RequestOptions): Promise<T> {
    const base = options.absolute ? this.apiUrl : `${this.apiUrl}/api/v1`;
    const url = new URL(`${base}${path}`);

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        method,
        headers: {
          accept: 'application/json',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
          ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
          ...options.headers,
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new CliError(
        timedOut ? `${method} ${path} timed out` : `Could not reach ${this.apiUrl}: ${reason}`,
        ExitCode.UNREACHABLE,
        'Check the API is running and that --api-url points at it.',
      );
    } finally {
      clearTimeout(timeout);
    }

    options.onHeaders?.(response.headers);

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    const payload = text ? safeParse(text) : undefined;

    if (!response.ok) throw toCliError(response.status, payload, method, path);
    return payload as T;
  }
}

interface ApiErrorBody {
  code?: string;
  message?: string | string[];
  correlationId?: string;
}

function toCliError(status: number, payload: unknown, method: string, path: string): CliError {
  const body = (payload ?? {}) as ApiErrorBody;
  const message = Array.isArray(body.message) ? body.message.join('; ') : body.message;
  const detail = message ?? `${method} ${path} failed with ${status}`;
  const code = body.code ? `${body.code}: ` : '';

  if (status === 401) {
    return new CliError(`${code}${detail}`, ExitCode.AUTH, 'Run `flama login` to re-authenticate.');
  }
  if (status === 403) {
    return new CliError(
      `${code}${detail}`,
      ExitCode.FORBIDDEN,
      'Your credential may be missing a permission — check `flama whoami`.',
    );
  }
  if (status === 404) return new CliError(`${code}${detail}`, ExitCode.NOT_FOUND);

  return new CliError(`${code}${detail}`, ExitCode.FAILURE);
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
