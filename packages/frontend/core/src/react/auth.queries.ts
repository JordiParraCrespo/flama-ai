'use client';

import type { LoginDto } from '@flama/shared';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { SocialAuthIntent, SocialProvider } from '../modules/auth/auth.client';
import { useFlamaApp } from './context';
import { featureFlagsQueryOptions } from './feature-flags.queries';
import { reconcileCacheOwner } from './persistence';
import { authKeys } from './query-keys';

export { authKeys };

import { profileQueryKey } from './users.queries';

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

      // Start the flags request now that we know who is asking, so it runs
      // beside the first route's code rather than after the first screen has
      // rendered its defaults. Not awaited: flags never hold up the gate, and
      // a fresh persisted copy makes this a no-op.
      void queryClient.prefetchQuery(
        featureFlagsQueryOptions(app, userId ? 'signed-in' : 'anonymous'),
      );

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

/**
 * What a social button hands the mutation. The `intent` is what separates the
 * login screen's button from the register screen's: the API refuses a provider
 * identity it has never seen unless the caller asked for a sign-up.
 */
export interface SocialLoginVariables {
  provider: SocialProvider;
  /** Defaults to `'sign-in'`, which refuses an identity with no account here. */
  intent?: SocialAuthIntent;
}

export function useSocialLogin(
  options?: Omit<UseMutationOptions<void, Error, SocialLoginVariables>, 'mutationFn'>,
) {
  const app = useFlamaApp();

  return useMutation<void, Error, SocialLoginVariables>({
    mutationFn: ({ provider, intent }) => app.auth.socialLogin(provider, intent),
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
