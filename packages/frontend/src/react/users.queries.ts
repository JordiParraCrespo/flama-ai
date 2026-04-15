"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type { UpdateUserDto } from "@flama/shared";
import type { UserEntity } from "../modules/users/user.entity";
import { useFlamaApp } from "./context";

export const usersKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", id] as const,
  me: ["users", "me"] as const,
};

export const profileQueryKey = usersKeys.me;

export function useProfile(
  options?: Omit<UseQueryOptions<UserEntity, Error>, "queryKey" | "queryFn">,
) {
  const app = useFlamaApp();

  return useQuery({
    queryKey: usersKeys.me,
    queryFn: () => app.users.me(),
    ...options,
  });
}

export function useUser(
  id: string,
  options?: Omit<UseQueryOptions<UserEntity, Error>, "queryKey" | "queryFn">,
) {
  const app = useFlamaApp();

  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: () => app.users.findById(id),
    ...options,
  });
}

export function useUpdateUser(
  options?: Omit<
    UseMutationOptions<UserEntity, Error, { id: string; dto: UpdateUserDto }>,
    "mutationFn"
  >,
) {
  const app = useFlamaApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserDto }) =>
      app.users.update(id, dto),
    onSuccess: (...args) => {
      queryClient.setQueryData(usersKeys.detail(args[1].id), args[0]);
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useDeleteUser(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) {
  const app = useFlamaApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => app.users.delete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
