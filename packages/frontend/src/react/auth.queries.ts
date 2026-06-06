"use client";

import type { LoginDto, RegisterDto } from "@flama/shared";
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { SocialProvider } from "../modules/auth/auth.client";
import { useFlamaApp } from "./context";
import { profileQueryKey } from "./users.queries";

export const authKeys = {
  all: ["auth"] as const,
  session: ["auth", "session"] as const,
};

export function useSessionRestore(
  options?: Omit<UseQueryOptions<void, Error>, "queryKey" | "queryFn">,
) {
  const app = useFlamaApp();

  return useQuery({
    queryKey: authKeys.session,
    queryFn: () => app.auth.restoreSession(),
    retry: false,
    staleTime: Infinity,
    ...options,
  });
}

export function useSocialLogin(
  options?: Omit<UseMutationOptions<void, Error, SocialProvider>, "mutationFn">,
) {
  const app = useFlamaApp();

  return useMutation({
    mutationFn: (provider: SocialProvider) => app.auth.socialLogin(provider),
    ...options,
  });
}

export function useLogin(
  options?: Omit<UseMutationOptions<void, Error, LoginDto>, "mutationFn">,
) {
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
  options?: Omit<UseMutationOptions<void, Error, RegisterDto>, "mutationFn">,
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

export function useLogout(
  options?: Omit<UseMutationOptions<void, Error, void>, "mutationFn">,
) {
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
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
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
    "mutationFn"
  >,
) {
  const app = useFlamaApp();

  return useMutation({
    mutationFn: ({ token, password }) =>
      app.auth.resetPassword(token, password),
    ...options,
  });
}

export function useChangePassword(
  options?: Omit<
    UseMutationOptions<
      void,
      Error,
      { currentPassword: string; newPassword: string }
    >,
    "mutationFn"
  >,
) {
  const app = useFlamaApp();

  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      app.auth.changePassword(currentPassword, newPassword),
    ...options,
  });
}
