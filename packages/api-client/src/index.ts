import createClient from "openapi-fetch";
import type { paths } from "./generated/api";

export type { paths } from "./generated/api";

export type ApiClientOptions = {
  baseUrl: string;
  accessToken?: string;
};

export function createApiClient(options: ApiClientOptions) {
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    headers: options.accessToken
      ? { Authorization: `Bearer ${options.accessToken}` }
      : undefined,
  });

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
