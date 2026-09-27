import type { IncomingHttpHeaders } from 'node:http';
import { AppError } from '@flama/backend-core';
import type { AdminCreateUserDto, AdminUpdateUserDto, ListUsersQuery } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { auth } from '../../auth/infrastructure/better-auth.config';
import {
  asRecord,
  betterAuthHeaders,
  unwrapArray,
} from '../../auth/infrastructure/better-auth.util';
import { AdminUserMapper } from '../admin-user.mapper';
import { AdminErrors } from '../domain/admin.errors';
import type {
  AdminSessionResponseDto,
  AdminSuccessResponseDto,
  AdminUserListResponseDto,
  AdminUserResponseDto,
} from '../dtos/admin-user.response.dto';
import type { AdminAuthPort, BanInput, SessionSwitch } from './admin-auth.port';
import { invokeAdminApi } from './admin-auth.util';

/**
 * Better Auth infers the admin `role` type from the configured `adminRoles`.
 * The REST layer accepts free-form role names, so the cast happens here, once.
 */
type AdminRole = 'user' | 'admin' | 'superadmin';
function asAdminRole(role: string | string[]): AdminRole | AdminRole[] {
  return role as AdminRole | AdminRole[];
}

/** The `Set-Cookie` values of a Better Auth response, for the controller to forward. */
function setCookiesOf(headers: Headers): string[] {
  const getSetCookie = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  return getSetCookie ? getSetCookie.call(headers) : [];
}

/**
 * The admin operations, delegated to Better Auth's admin plugin.
 *
 * Better Auth owns the `user` and `session` tables and the impersonation
 * cookie, so these are delegated rather than re-implemented. Every call goes
 * through `invokeAdminApi`, which folds Better Auth's errors onto this module's
 * catalog, and every result through `AdminUserMapper`.
 */
@Injectable()
export class AdminAuthGateway implements AdminAuthPort {
  constructor(private readonly mapper: AdminUserMapper) {}

  async listUsers(
    headers: IncomingHttpHeaders,
    query: Partial<ListUsersQuery>,
  ): Promise<AdminUserListResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.listUsers({
        query: {
          searchValue: query.searchValue,
          searchField: query.searchField,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          sortDirection: query.sortDirection,
        },
        headers: betterAuthHeaders(headers),
      }),
    );
    return this.mapper.toListResponse(result);
  }

  async getUser(headers: IncomingHttpHeaders, userId: string): Promise<AdminUserResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.getUser({ query: { id: userId }, headers: betterAuthHeaders(headers) }),
    );
    return this.mapper.toResponse(result);
  }

  async createUser(
    headers: IncomingHttpHeaders,
    input: AdminCreateUserDto,
  ): Promise<AdminUserResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.createUser({
        body: {
          email: input.email,
          name: input.name,
          password: input.password,
          role: input.role ? asAdminRole(input.role) : undefined,
        },
        headers: betterAuthHeaders(headers),
      }),
    );
    return this.mapper.toResponse(result);
  }

  async updateUser(
    headers: IncomingHttpHeaders,
    userId: string,
    data: AdminUpdateUserDto,
  ): Promise<AdminUserResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.adminUpdateUser({ body: { userId, data }, headers: betterAuthHeaders(headers) }),
    );
    return this.mapper.toResponse(result);
  }

  async setRole(
    headers: IncomingHttpHeaders,
    userId: string,
    role: string | string[],
  ): Promise<AdminUserResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.setRole({
        body: { userId, role: asAdminRole(role) },
        headers: betterAuthHeaders(headers),
      }),
    );
    return this.mapper.toResponse(result);
  }

  async banUser(
    headers: IncomingHttpHeaders,
    userId: string,
    input: BanInput,
  ): Promise<AdminUserResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.banUser({
        body: { userId, banReason: input.banReason, banExpiresIn: input.banExpiresIn },
        headers: betterAuthHeaders(headers),
      }),
    );
    return this.mapper.toResponse(result);
  }

  async unbanUser(headers: IncomingHttpHeaders, userId: string): Promise<AdminUserResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.unbanUser({ body: { userId }, headers: betterAuthHeaders(headers) }),
    );
    return this.mapper.toResponse(result);
  }

  async removeUser(headers: IncomingHttpHeaders, userId: string): Promise<AdminSuccessResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.removeUser({ body: { userId }, headers: betterAuthHeaders(headers) }),
    );
    return this.mapper.toSuccessResponse(result);
  }

  async listSessions(
    headers: IncomingHttpHeaders,
    userId: string,
  ): Promise<AdminSessionResponseDto[]> {
    const result = await invokeAdminApi(() =>
      auth.api.listUserSessions({ body: { userId }, headers: betterAuthHeaders(headers) }),
    );
    return this.mapper.toSessionsResponse(result);
  }

  /**
   * Better Auth revokes by session token, which is a live bearer credential and
   * so never handed to a client. The id is resolved to its token here, from the
   * user's own sessions, and the token never leaves the API.
   */
  async revokeSession(
    headers: IncomingHttpHeaders,
    userId: string,
    sessionId: string,
  ): Promise<AdminSuccessResponseDto> {
    const authHeaders = betterAuthHeaders(headers);
    const sessions = await invokeAdminApi(() =>
      auth.api.listUserSessions({ body: { userId }, headers: authHeaders }),
    );
    const match = unwrapArray(sessions, 'sessions')
      .map(asRecord)
      .find((session) => String(session.id) === sessionId);
    if (!match) throw new AppError(AdminErrors.SESSION_NOT_FOUND);

    const result = await invokeAdminApi(() =>
      auth.api.revokeUserSession({
        body: { sessionToken: String(match.token) },
        headers: authHeaders,
      }),
    );
    return this.mapper.toSuccessResponse(result);
  }

  async revokeSessions(
    headers: IncomingHttpHeaders,
    userId: string,
  ): Promise<AdminSuccessResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.revokeUserSessions({ body: { userId }, headers: betterAuthHeaders(headers) }),
    );
    return this.mapper.toSuccessResponse(result);
  }

  async setPassword(
    headers: IncomingHttpHeaders,
    userId: string,
    newPassword: string,
  ): Promise<AdminSuccessResponseDto> {
    const result = await invokeAdminApi(() =>
      auth.api.setUserPassword({
        body: { userId, newPassword },
        headers: betterAuthHeaders(headers),
      }),
    );
    return this.mapper.toSuccessResponse(result);
  }

  async impersonate(headers: IncomingHttpHeaders, userId: string): Promise<SessionSwitch> {
    const { response, headers: out } = await invokeAdminApi(() =>
      auth.api.impersonateUser({
        body: { userId },
        headers: betterAuthHeaders(headers),
        returnHeaders: true,
      }),
    );
    return { user: this.mapper.toResponse(response), cookies: setCookiesOf(out) };
  }

  async stopImpersonating(headers: IncomingHttpHeaders): Promise<SessionSwitch> {
    const { response, headers: out } = await invokeAdminApi(() =>
      auth.api.stopImpersonating({ headers: betterAuthHeaders(headers), returnHeaders: true }),
    );
    return { user: this.mapper.toResponse(response), cookies: setCookiesOf(out) };
  }
}
