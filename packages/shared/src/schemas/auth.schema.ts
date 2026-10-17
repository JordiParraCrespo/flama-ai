import { z } from 'zod';

/**
 * Auth DTOs. These carry no failure messages on purpose: an explicit message
 * wins over any error map Zod is handed, which would pin every consumer to
 * English. The apps translate from the issue code instead — see
 * `createZodErrorMap` in `@flama/frontend-core/validation`.
 */

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

/**
 * The reset-password form: the new password twice. Not a request body — the
 * token comes from the link, not the reader — so it picks the password rule
 * from the DTO rather than restating it.
 */
export const newPasswordSchema = resetPasswordSchema
  .pick({ password: true })
  .extend({ confirmPassword: z.string().min(8) });

/**
 * Accepting an invitation: the invitee's address is fixed by the invitation
 * itself, so the form only collects a display name and a password.
 */
export const acceptInvitationSchema = z.object({
  fullName: z.string().min(1),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

/**
 * Answering the two-factor challenge a password sign-in ends in, with a code
 * from the authenticator app or a backup code. Only "something was typed" is
 * checked here: the two have different shapes, and the server is the one that
 * knows whether it is right.
 */
export const twoFactorChallengeSchema = z.object({
  code: z.string().trim().min(1),
  trustDevice: z.boolean(),
});

/** Confirming an authenticator app at enrolment: the six digits it shows now. */
export const twoFactorCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

/** Turning two-factor off, or replacing the backup codes, asks for the password again. */
export const twoFactorPasswordSchema = z.object({
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type TwoFactorChallengeDto = z.infer<typeof twoFactorChallengeSchema>;
export type TwoFactorCodeDto = z.infer<typeof twoFactorCodeSchema>;
export type TwoFactorPasswordDto = z.infer<typeof twoFactorPasswordSchema>;
