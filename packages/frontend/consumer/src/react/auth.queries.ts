'use client';

import type { TwoFactorEnrolment } from '@flama/frontend-core';
import { usersKeys, withCacheOnSuccess } from '@flama/frontend-core/react';
import type { RegisterDto } from '@flama/shared';
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConsumerApp } from './context';
import { profileKeys } from './profile.queries';

/**
 * Sign-up is the consumer product's: an account is created here and nowhere
 * else, which is why the hook lives in this package while `useLogin` and the
 * session live in the kernel. The service method stays on the kernel's
 * `AuthService` because it shares the identity tracking every sign-in uses.
 */
export function useRegister(
  options?: Omit<UseMutationOptions<void, Error, RegisterDto>, 'mutationFn'>,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();

  return useMutation<void, Error, RegisterDto>({
    mutationFn: (dto: RegisterDto) => app.auth.register(dto),
    // Both views of the caller: the directory's, which the shell reads, and the
    // account's own, which Settings reads.
    ...withCacheOnSuccess(options, () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.me() });
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    }),
  });
}

/**
 * Two-factor enrolment is managed from the consumer's profile, so its hooks
 * live here beside `useRegister`, over the kernel's `AuthService` that also
 * answers the sign-in challenge (`useVerifyTwoFactor`).
 *
 * Starting an enrolment answers the URI to scan and the backup codes, and
 * changes nothing the profile shows: two-factor stays off until
 * {@link useConfirmTwoFactor}.
 */
export function useEnableTwoFactor(
  options?: Omit<UseMutationOptions<TwoFactorEnrolment, Error, string>, 'mutationFn'>,
) {
  const app = useConsumerApp();

  return useMutation<TwoFactorEnrolment, Error, string>({
    mutationFn: (password: string) => app.auth.enableTwoFactor(password),
    ...options,
  });
}

/**
 * Confirming and disabling both flip the profile's `twoFactorEnabled`, and
 * both replace the current session with a new one, so the device list changes
 * too.
 */
function invalidateTwoFactorViews(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: profileKeys.me() });
  queryClient.invalidateQueries({ queryKey: profileKeys.sessions() });
}

/** Confirm the enrolment with a first code from the app, turning two-factor on. */
export function useConfirmTwoFactor(
  options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (code: string) => app.auth.confirmTwoFactor(code),
    ...withCacheOnSuccess(options, () => invalidateTwoFactorViews(queryClient)),
  });
}

export function useDisableTwoFactor(
  options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (password: string) => app.auth.disableTwoFactor(password),
    ...withCacheOnSuccess(options, () => invalidateTwoFactorViews(queryClient)),
  });
}

/** Replace the backup codes, answering the new ones; the old ones stop working. */
export function useGenerateBackupCodes(
  options?: Omit<UseMutationOptions<string[], Error, string>, 'mutationFn'>,
) {
  const app = useConsumerApp();

  return useMutation<string[], Error, string>({
    mutationFn: (password: string) => app.auth.generateBackupCodes(password),
    ...options,
  });
}
