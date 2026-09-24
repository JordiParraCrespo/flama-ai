import { Avatar, AvatarFallback } from '@flama/design-system-mobile/avatar';
import { Skeleton } from '@flama/design-system-mobile/skeleton';
import { Text } from '@flama/design-system-mobile/text';
import type { UserEntity } from '@flama/frontend-core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

/** The greeting at the top of home: the reader's initials and first name. */
export function AccountHero({ user, isLoading }: { user?: UserEntity; isLoading: boolean }) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-4">
      <Avatar alt={user?.fullName ?? ''} className="size-14">
        <AvatarFallback>
          <Text className="text-lg font-medium text-ink-900">{user?.initials ?? ''}</Text>
        </AvatarFallback>
      </Avatar>
      <View className="flex-1 gap-1">
        {isLoading ? (
          <Skeleton className="h-7 w-48" />
        ) : (
          <Text className="text-2xl font-medium text-ink-900" numberOfLines={1}>
            {user?.firstName
              ? t('home.greeting', { name: user.firstName })
              : t('home.greetingFallback')}
          </Text>
        )}
        <Text className="text-sm text-ink-600">{t('home.subtitle')}</Text>
      </View>
    </View>
  );
}
