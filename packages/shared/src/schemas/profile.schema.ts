import { z } from 'zod';
import { changePasswordSchema } from './auth.schema';

/**
 * The caller's own account: the profile fields they may edit themselves.
 *
 * Identity (email, password, OAuth links) stays owned by Better Auth and is not
 * expressed here — the profile screen shows the email read-only on purpose.
 *
 * Schemas state the constraint only, never a message: an explicit string would
 * pin every consumer to English (see `.agents/rules/forms.md`).
 */

/** Image types accepted for an avatar, and the ceiling on its size. */
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number];
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Editable profile fields. Every field is optional — the screen saves the whole
 * card, but a client may patch a single one. `phone` and `jobTitle` accept
 * `null` to clear them; omitting a field leaves it untouched.
 */
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(32).nullable().optional(),
  jobTitle: z.string().min(1).max(120).nullable().optional(),
});

/**
 * Changing your own password.
 *
 * `revokeOtherSessions` defaults to `true`: the usual reason to change a
 * password is that the old one may be known to someone else, and leaving their
 * session alive would make the change pointless. A client can opt out
 * explicitly when it knows better.
 */
export const changeOwnPasswordSchema = changePasswordSchema.extend({
  revokeOtherSessions: z.boolean().optional().default(true),
});

export const profileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  jobTitle: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.string(),
  emailVerified: z.boolean(),
  /**
   * Always `false` for now — the Better Auth `twoFactor` plugin is not enabled
   * on this deployment. Present so the settings screen can render the row in
   * its off state without branching on whether the field exists.
   */
  twoFactorEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const userSessionResponseSchema = z.object({
  id: z.string().uuid(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  /** True for the session the request was made with — it cannot be revoked. */
  current: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type ChangeOwnPasswordDto = z.infer<typeof changeOwnPasswordSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
export type UserSessionResponse = z.infer<typeof userSessionResponseSchema>;
