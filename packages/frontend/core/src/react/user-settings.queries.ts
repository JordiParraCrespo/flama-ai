'use client';

import type { UpdateUserSettingsDto } from '@flama/shared/schemas/profile';
import { type UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserSettingsEntity } from '../modules/user-settings/user-settings.entity';
import { useFlamaApp } from './context';
import { type HookMutationOptions, withCacheOnSuccess } from './mutations';
import { userSettingsKeys } from './query-keys';

export { userSettingsKeys };

export function useUserSettings(
  options?: Omit<UseQueryOptions<UserSettingsEntity, Error>, 'queryKey' | 'queryFn'>,
) {
  const app = useFlamaApp();

  return useQuery({
    queryKey: userSettingsKeys.me(),
    queryFn: () => app.userSettings.get(),
    ...options,
  });
}

export function useUpdateUserSettings(
  options?: HookMutationOptions<UserSettingsEntity, Error, UpdateUserSettingsDto>,
) {
  const app = useFlamaApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateUserSettingsDto) => app.userSettings.update(dto),
    ...withCacheOnSuccess(options, (settings) => {
      queryClient.setQueryData(userSettingsKeys.me(), settings);
    }),
  });
}
