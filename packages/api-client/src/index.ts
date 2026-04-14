import createClient from 'openapi-fetch';
import type { paths } from './generated/api';

export type { paths } from './generated/api';

export type ApiClientOptions = {
  baseUrl: string;
  accessToken?: string;
};

export function createApiClient(options: ApiClientOptions) {
  return createClient<paths>({
    baseUrl: options.baseUrl,
    headers: options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : undefined,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;

export class AuthClient {
  constructor(private readonly client: ApiClient) {}

  register(body: { email: string; password: string; firstName: string; lastName: string }) {
    return this.client.POST('/api/v1/auth/register', { body });
  }

  login(body: { email: string; password: string }) {
    return this.client.POST('/api/v1/auth/login', { body });
  }

  logout() {
    return this.client.POST('/api/v1/auth/logout');
  }

  refresh() {
    return this.client.POST('/api/v1/auth/refresh');
  }

  forgotPassword(body: { email: string }) {
    return this.client.POST('/api/v1/auth/forgot-password', { body });
  }

  resetPassword(body: { token: string; password: string }) {
    return this.client.POST('/api/v1/auth/reset-password', { body });
  }

  getProfile() {
    return this.client.GET('/api/v1/auth/profile');
  }
}

export class UsersClient {
  constructor(private readonly client: ApiClient) {}

  findAll(query?: { page?: number; limit?: number; role?: string; search?: string }) {
    return this.client.GET('/api/v1/users', { params: { query } });
  }

  findById(id: string) {
    return this.client.GET('/api/v1/users/{id}', { params: { path: { id } } });
  }

  update(id: string, body: { firstName?: string; lastName?: string; role?: string }) {
    return this.client.PATCH('/api/v1/users/{id}', {
      params: { path: { id } },
      body,
    });
  }

  delete(id: string) {
    return this.client.DELETE('/api/v1/users/{id}', {
      params: { path: { id } },
    });
  }
}

export function createModuleClients(options: ApiClientOptions) {
  const client = createApiClient(options);
  return {
    auth: new AuthClient(client),
    users: new UsersClient(client),
    raw: client,
  };
}
