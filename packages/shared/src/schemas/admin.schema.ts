import { z } from 'zod';

/**
 * Contracts for the Better Auth admin plugin (super-admin) operations. Used for
 * client-side form validation and shared types; the plugin exposes the actual
 * endpoints under `/api/auth/admin/*`.
 */

export const listUsersQuerySchema = z.object({
  searchValue: z.string().optional(),
  searchField: z.enum(['email', 'name']).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

export const setUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.union([z.string(), z.array(z.string())]),
});

export const banUserSchema = z.object({
  userId: z.string().uuid(),
  banReason: z.string().max(500).optional(),
  /** Seconds until the ban expires; omit for a permanent ban. */
  banExpiresIn: z.number().int().positive().optional(),
});

export const unbanUserSchema = z.object({
  userId: z.string().uuid(),
});

export const impersonateUserSchema = z.object({
  userId: z.string().uuid(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type SetUserRoleDto = z.infer<typeof setUserRoleSchema>;
export type BanUserDto = z.infer<typeof banUserSchema>;
export type UnbanUserDto = z.infer<typeof unbanUserSchema>;
export type ImpersonateUserDto = z.infer<typeof impersonateUserSchema>;
