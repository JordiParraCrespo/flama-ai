/**
 * Runtime config for the generated hey-api client.
 * Wired from `@flama/frontend` at app boot (base URL + auth headers).
 *
 * The generated module is created by `pnpm generate:api-client`. Until then
 * this file only types the seam.
 */
export type AuthHeaders = Record<string, string> | Promise<Record<string, string>>;

export type ApiClientConfig = {
  baseUrl: string;
  credentials?: RequestCredentials;
  headers?: () => AuthHeaders;
};

let headersFn: (() => AuthHeaders) | undefined;

export function getAuthHeaders(): AuthHeaders {
  return headersFn?.() ?? {};
}

export function rememberHeaders(headers: () => AuthHeaders): void {
  headersFn = headers;
}

let interceptorAdded = false;

/**
 * Apply the base URL and the auth headers to the hey-api client. The headers
 * are read per request, so a session that refreshes its token is picked up
 * without reconfiguring; a bearer-token app (mobile) depends on them, a cookie
 * session (web) passes through with them empty.
 */
export async function applyApiClientConfig(config: ApiClientConfig): Promise<void> {
  rememberHeaders(config.headers ?? (() => ({})));
  const { client } = await import('./generated/client.gen');
  client.setConfig({
    baseUrl: config.baseUrl,
    credentials: config.credentials ?? 'include',
  });
  if (interceptorAdded) return;
  interceptorAdded = true;
  client.interceptors.request.use(async (request) => {
    for (const [name, value] of Object.entries(await getAuthHeaders())) {
      request.headers.set(name, value);
    }
    return request;
  });
}
