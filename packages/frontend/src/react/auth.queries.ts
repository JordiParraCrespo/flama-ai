'use client';

import type { LoginDto, RegisterDto } from '@flama/shared';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { SocialProvider } from '../modules/auth/auth.client';
import { useFlamaApp } from './context';
import { reconcileCacheOwner } from './persistence';
import { profileQueryKey } from './users.queries';

/**
 * Query key factory for the `auth` feature. Every key is derived from `all`
 * so the whole subtree can be invalidated/cleared with a single key. See the
 * "React Query keys" guide in the docs for the rationale.
 */
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

export function useSessionRestore(
  options?: Omit<UseQueryOptions<string | null, Error>, 'queryKey' | 'queryFn'>,
) {
  const app = useFlamaApp();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: authKeys.session(),
    queryFn: async () => {
      const userId = await app.auth.restoreSession();

      // A persisted cache can outlive the session it was written under, so
      // check it still belongs to whoever is signed in now — before this
      // resolves and either app's gate renders anything from it.
      reconcileCacheOwner(queryClient, userId);

      return userId;
    },
    // Retry transient failures on startup. `restoreSession()` only rejects when
    // the session lookup itself fails (network/server error) — a genuinely
    // unauthenticated user resolves successfully, so retries never fire for
    // them. Without this a single network blip masquerades as "logged out" and
    // silently bounces the user to /login.
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: Infinity,
    ...options,
  });
}

export function useSocialLogin(
  options?: Omit<UseMutationOptions<void, Error, SocialProvider>, 'mutationFn'>,
) {
  const app = useFlamaApp();

  return useMutation({
    mutationFn: (provider: SocialProvider) => app.auth.socialLogin(provider),
    ...options,
  });
}

export function useLogin(options?: Omit<UseMutationOptions<void, Error, LoginDto>, 'mutationFn'>) {
  const app = useFlamaApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: LoginDto) => app.auth.login(dto),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useRegister(
  options?: Omit<UseMutationOptions<void, Error, RegisterDto>, 'mutationFn'>,
) {
  const app = useFlamaApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: RegisterDto) => app.auth.register(dto),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useLogout(options?: Omit<UseMutationOptions<void, Error, void>, 'mutationFn'>) {
  const app = useFlamaApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => app.auth.logout(),
    onSuccess: (...args) => {
      queryClient.clear();
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useForgotPassword(
  options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>,
) {
  const app = useFlamaApp();

  return useMutation({
    mutationFn: (email: string) => app.auth.forgotPassword(email),
    ...options,
  });
}

export function useResetPassword(
  options?: Omit<
    UseMutationOptions<void, Error, { token: string; password: string }>,
    'mutationFn'
  >,
) {
  const app = useFlamaApp();

  return useMutation({
    mutationFn: ({ token, password }) => app.auth.resetPassword(token, password),
    ...options,
  });
}

export function useChangePassword(
  options?: Omit<
    UseMutationOptions<void, Error, { currentPassword: string; newPassword: string }>,
    'mutationFn'
  >,
) {
  const app = useFlamaApp();

  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      app.auth.changePassword(currentPassword, newPassword),
    ...options,
  });
}
