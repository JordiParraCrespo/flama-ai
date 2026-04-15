"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { LoginDto, RegisterDto } from "@flama/shared";
import { useFlamaApp } from "./context";
import { profileQueryKey } from "./users.queries";

export const authKeys = {
  all: ["auth"] as const,
};

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
