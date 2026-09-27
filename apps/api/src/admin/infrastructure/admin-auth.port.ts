import type { IncomingHttpHeaders } from 'node:http';
import type { AdminCreateUserDto, AdminUpdateUserDto, ListUsersQuery } from '@flama/shared';
import type {
  AdminSessionResponseDto,
  AdminSuccessResponseDto,
  AdminUserListResponseDto,
  AdminUserResponseDto,
} from '../dtos/admin-user.response.dto';

/** Why and for how long an account is banned; no expiry is a permanent ban. */
export interface BanInput {
  banReason?: string;
  /** Seconds until the ban lifts. */
  banExpiresIn?: number;
}

/**
 * A session switch: the account now acting, and the `Set-Cookie` values that
 * carry the switch to the browser.
 */
export interface SessionSwitch {
  user: AdminUserResponseDto;
  cookies: string[];
}

/**
 * What the admin use cases need done to other people's accounts.
 *
 * The application's vocabulary is "ban this account", "sign them out
 * everywhere", "act as them". That an identity provider owns the account
 * tables, resolves session tokens and signs the impersonation cookie are
 * facts about the adapter — a handler names none of them. Every call carries
 * the request headers: the provider decides from them who is asking.
 */
export interface AdminAuthPort {
  listUsers(
    headers: IncomingHttpHeaders,
    query: Partial<ListUsersQuery>,
  ): Promise<AdminUserListResponseDto>;
  getUser(headers: IncomingHttpHeaders, userId: string): Promise<AdminUserResponseDto>;
  createUser(
    headers: IncomingHttpHeaders,
    input: AdminCreateUserDto,
  ): Promise<AdminUserResponseDto>;
  updateUser(
    headers: IncomingHttpHeaders,
    userId: string,
    data: AdminUpdateUserDto,
  ): Promise<AdminUserResponseDto>;
  setRole(
    headers: IncomingHttpHeaders,
    userId: string,
    role: string | string[],
  ): Promise<AdminUserResponseDto>;
  banUser(
    headers: IncomingHttpHeaders,
    userId: string,
    input: BanInput,
  ): Promise<AdminUserResponseDto>;
  unbanUser(headers: IncomingHttpHeaders, userId: string): Promise<AdminUserResponseDto>;
  removeUser(headers: IncomingHttpHeaders, userId: string): Promise<AdminSuccessResponseDto>;
  listSessions(headers: IncomingHttpHeaders, userId: string): Promise<AdminSessionResponseDto[]>;
  /**
   * Revoke one of a user's sessions, named by its id. The session token is a
   * live credential and never reaches a client; resolving the id to it is the
   * adapter's job.
   */
  revokeSession(
    headers: IncomingHttpHeaders,
    userId: string,
    sessionId: string,
  ): Promise<AdminSuccessResponseDto>;
  revokeSessions(headers: IncomingHttpHeaders, userId: string): Promise<AdminSuccessResponseDto>;
  setPassword(
    headers: IncomingHttpHeaders,
    userId: string,
    newPassword: string,
  ): Promise<AdminSuccessResponseDto>;
  /** Start acting as another account. */
  impersonate(headers: IncomingHttpHeaders, userId: string): Promise<SessionSwitch>;
  /** Stop acting as another account and return to the caller's own session. */
  stopImpersonating(headers: IncomingHttpHeaders): Promise<SessionSwitch>;
}
