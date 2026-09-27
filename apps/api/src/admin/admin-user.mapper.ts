import { Injectable } from '@nestjs/common';
import { asArray, asRecord, unwrap, unwrapArray } from '../auth/infrastructure/better-auth.util';
import type {
  AdminSessionResponseDto,
  AdminSuccessResponseDto,
  AdminUserListResponseDto,
  AdminUserResponseDto,
} from './dtos/admin-user.response.dto';

/**
 * Maps what the Better Auth admin plugin answers onto this module's response
 * shapes. Every method takes `unknown` and narrows once, so the gateway carries
 * no casts: envelope unwrapping (`{ user }`, `{ sessions }`), coercion and date
 * parsing all happen here.
 */
@Injectable()
export class AdminUserMapper {
  /** One user, from the record itself or a `{ user }` envelope. */
  toResponse(input: unknown): AdminUserResponseDto {
    const user = asRecord(unwrap(input, 'user'));
    return {
      id: String(user.id),
      email: String(user.email),
      name: String(user.name ?? ''),
      role: (user.role as string | null) ?? null,
      emailVerified: Boolean(user.emailVerified),
      banned: Boolean(user.banned),
      banReason: (user.banReason as string | null) ?? null,
      banExpires: toDateOrNull(user.banExpires),
      createdAt: toDate(user.createdAt),
    };
  }

  /** The paginated list `{ users, total, limit, offset }`. */
  toListResponse(input: unknown): AdminUserListResponseDto {
    const page = asRecord(input);
    return {
      users: asArray(page.users).map((user) => this.toResponse(user)),
      total: Number(page.total ?? 0),
      limit: toNumberOrNull(page.limit),
      offset: toNumberOrNull(page.offset),
    };
  }

  /** A user's sessions, from a `{ sessions }` envelope or a bare array. */
  toSessionsResponse(input: unknown): AdminSessionResponseDto[] {
    return unwrapArray(input, 'sessions').map((value) => {
      const session = asRecord(value);
      return {
        id: String(session.id),
        userId: String(session.userId),
        expiresAt: toDate(session.expiresAt),
        ipAddress: (session.ipAddress as string | null) ?? null,
        userAgent: (session.userAgent as string | null) ?? null,
        createdAt: toDate(session.createdAt),
      };
    });
  }

  /** Better Auth's `success` or `status` flag. */
  toSuccessResponse(input: unknown): AdminSuccessResponseDto {
    const result = asRecord(input);
    return { success: Boolean(result.success ?? result.status) };
  }
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(value as string);
}

function toDateOrNull(value: unknown): Date | null {
  return value == null ? null : toDate(value);
}

function toNumberOrNull(value: unknown): number | null {
  return value == null ? null : Number(value);
}
