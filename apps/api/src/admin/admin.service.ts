import type { IncomingHttpHeaders } from 'node:http';
import type { AdminCreateUserDto, AdminUpdateUserDto, ListUsersQuery } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { auth } from '../auth/auth';
import { betterAuthHeaders, invokeBetterAuth } from '../auth/better-auth.util';
import type {
  AdminSessionResponseDto,
  AdminUserListResponseDto,
  AdminUserResponseDto,
} from './dtos/admin-user.response.dto';

type Raw = Record<string, unknown>;

/**
 * Better Auth infers the admin `role` type from the configured `adminRoles`.
 * The REST layer accepts free-form role strings, so we cast at the boundary.
 */
type AdminRole = 'user' | 'admin' | 'superadmin';
function asAdminRole(role: string | string[]): AdminRole | AdminRole[] {
  return role as AdminRole | AdminRole[];
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(value as string);
}
function toDateOrNull(value: unknown): Date | null {
  return value == null ? null : toDate(value);
}

function mapUser(u: Raw): AdminUserResponseDto {
  return {
    id: String(u.id),
    email: String(u.email),
    name: String(u.name ?? ''),
    role: (u.role as string | null) ?? null,
    emailVerified: Boolean(u.emailVerified),
    banned: Boolean(u.banned),
    banReason: (u.banReason as string | null) ?? null,
    banExpires: toDateOrNull(u.banExpires),
    createdAt: toDate(u.createdAt),
  };
}

function mapSession(s: Raw): AdminSessionResponseDto {
  return {
    id: String(s.id),
    userId: String(s.userId),
    token: String(s.token ?? ''),
    expiresAt: toDate(s.expiresAt),
    ipAddress: (s.ipAddress as string | null) ?? null,
    userAgent: (s.userAgent as string | null) ?? null,
    createdAt: toDate(s.createdAt),
  };
}

/**
 * Delegating façade over the Better Auth **admin** plugin (`auth.api.*`).
 * Provides super-admin user management. Impersonation issues a session cookie,
 * so those calls return Better Auth's response headers for the controller to
 * forward to the client.
 */
@Injectable()
export class AdminService {
  private headers(headers: IncomingHttpHeaders): Headers {
    return betterAuthHeaders(headers);
  }

  async listUsers(
    headers: IncomingHttpHeaders,
    query: Partial<ListUsersQuery>,
  ): Promise<AdminUserListResponseDto> {
    const result = (await invokeBetterAuth(() =>
      auth.api.listUsers({
        query: {
          searchValue: query.searchValue,
          searchField: query.searchField,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortDirection: query.sortDirection,
        },
        headers: this.headers(headers),
      }),
    )) as unknown as {
      users?: Raw[];
      total?: number;
      limit?: number;
      offset?: number;
    };
    return {
      users: (result.users ?? []).map(mapUser),
      total: result.total ?? 0,
      limit: result.limit ?? null,
      offset: result.offset ?? null,
    };
  }

  async getUser(headers: IncomingHttpHeaders, id: string): Promise<AdminUserResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.getUser({ query: { id }, headers: this.headers(headers) }),
    );
    return mapUser(result as unknown as Raw);
  }

  async createUser(
    headers: IncomingHttpHeaders,
    dto: AdminCreateUserDto,
  ): Promise<AdminUserResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.createUser({
        body: {
          email: dto.email,
          name: dto.name,
          password: dto.password,
          role: dto.role ? asAdminRole(dto.role) : undefined,
        },
        headers: this.headers(headers),
      }),
    );
    const user = (result as unknown as { user?: Raw }).user ?? (result as unknown as Raw);
    return mapUser(user);
  }

  async updateUser(
    headers: IncomingHttpHeaders,
    id: string,
    data: AdminUpdateUserDto,
  ): Promise<AdminUserResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.adminUpdateUser({
        body: { userId: id, data },
        headers: this.headers(headers),
      }),
    );
    return mapUser(result as unknown as Raw);
  }

  async setRole(
    headers: IncomingHttpHeaders,
    id: string,
    role: string | string[],
  ): Promise<AdminUserResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.setRole({
        body: { userId: id, role: asAdminRole(role) },
        headers: this.headers(headers),
      }),
    );
    const user = (result as unknown as { user?: Raw }).user ?? (result as unknown as Raw);
    return mapUser(user);
  }

  async ban(
    headers: IncomingHttpHeaders,
    id: string,
    opts: { banReason?: string; banExpiresIn?: number },
  ): Promise<AdminUserResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.banUser({
        body: {
          userId: id,
          banReason: opts.banReason,
          banExpiresIn: opts.banExpiresIn,
        },
        headers: this.headers(headers),
      }),
    );
    const user = (result as unknown as { user?: Raw }).user ?? (result as unknown as Raw);
    return mapUser(user);
  }

  async unban(headers: IncomingHttpHeaders, id: string): Promise<AdminUserResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.unbanUser({
        body: { userId: id },
        headers: this.headers(headers),
      }),
    );
    const user = (result as unknown as { user?: Raw }).user ?? (result as unknown as Raw);
    return mapUser(user);
  }

  async remove(headers: IncomingHttpHeaders, id: string): Promise<{ success: boolean }> {
    const result = await invokeBetterAuth(() =>
      auth.api.removeUser({
        body: { userId: id },
        headers: this.headers(headers),
      }),
    );
    return {
      success: Boolean((result as unknown as { success?: boolean }).success),
    };
  }

  async listSessions(headers: IncomingHttpHeaders, id: string): Promise<AdminSessionResponseDto[]> {
    const result = await invokeBetterAuth(() =>
      auth.api.listUserSessions({
        body: { userId: id },
        headers: this.headers(headers),
      }),
    );
    const sessions = (result as unknown as { sessions?: Raw[] }).sessions ?? [];
    return sessions.map(mapSession);
  }

  async revokeSession(
    headers: IncomingHttpHeaders,
    sessionToken: string,
  ): Promise<{ success: boolean }> {
    const result = await invokeBetterAuth(() =>
      auth.api.revokeUserSession({
        body: { sessionToken },
        headers: this.headers(headers),
      }),
    );
    return {
      success: Boolean((result as unknown as { success?: boolean }).success),
    };
  }

  async revokeAllSessions(headers: IncomingHttpHeaders, id: string): Promise<{ success: boolean }> {
    const result = await invokeBetterAuth(() =>
      auth.api.revokeUserSessions({
        body: { userId: id },
        headers: this.headers(headers),
      }),
    );
    return {
      success: Boolean((result as unknown as { success?: boolean }).success),
    };
  }

  async setPassword(
    headers: IncomingHttpHeaders,
    id: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const result = await invokeBetterAuth(() =>
      auth.api.setUserPassword({
        body: { userId: id, newPassword },
        headers: this.headers(headers),
      }),
    );
    return {
      success: Boolean((result as unknown as { status?: boolean }).status),
    };
  }

  /**
   * Impersonate a user. Better Auth issues a new session cookie, returned in the
   * response headers so the controller can forward the `Set-Cookie` to the client.
   */
  async impersonate(
    headers: IncomingHttpHeaders,
    id: string,
  ): Promise<{ user: AdminUserResponseDto; headers: Headers }> {
    const { response, headers: outHeaders } = await invokeBetterAuth(() =>
      auth.api.impersonateUser({
        body: { userId: id },
        headers: this.headers(headers),
        returnHeaders: true,
      }),
    );
    const user = (response as unknown as { user?: Raw }).user ?? {};
    return { user: mapUser(user), headers: outHeaders };
  }

  /** Stop impersonating and restore the admin session (also cookie-setting). */
  async stopImpersonating(
    headers: IncomingHttpHeaders,
  ): Promise<{ user: AdminUserResponseDto; headers: Headers }> {
    const { response, headers: outHeaders } = await invokeBetterAuth(() =>
      auth.api.stopImpersonating({
        headers: this.headers(headers),
        returnHeaders: true,
      }),
    );
    const user = (response as unknown as { user?: Raw }).user ?? {};
    return { user: mapUser(user), headers: outHeaders };
  }
}
