import { Badge } from '@flama/design-system-mobile/badge';
import { Button } from '@flama/design-system-mobile/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-mobile/card';
import { Separator } from '@flama/design-system-mobile/separator';
import { Skeleton } from '@flama/design-system-mobile/skeleton';
import { Text } from '@flama/design-system-mobile/text';
import type { UserEntity } from '@flama/frontend-core';
import { formatMediumDate } from '@flama/frontend-core/format';
import { useLocale } from '@flama/frontend-core/react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { AccountRow } from '../components/account-row';

interface AccountCardProps {
  user?: UserEntity;
  isLoading: boolean;
  isFetching: boolean;
  onRetry: () => void;
}

/** The reader's own account: email, role, lifecycle and join date. */
export function AccountCard({ user, isLoading, isFetching, onRetry }: AccountCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.account')}</CardTitle>
        <CardDescription>{t('home.accountDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {isLoading ? (
          <View className="gap-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </View>
        ) : !user ? (
          <View className="gap-3">
            <Text className="text-sm text-ink-600">{t('home.accountUnavailable')}</Text>
            <Button variant="outline" onPress={onRetry} disabled={isFetching}>
              <Text>{isFetching ? t('home.retrying') : t('home.retry')}</Text>
            </Button>
          </View>
        ) : (
          <>
            <AccountRow label={t('home.email')}>{user.email}</AccountRow>
            <Separator />
            <AccountRow label={t('home.role')}>
              {/* Role names are free-form strings from the database, shown as
                  stored — the web app's `RolePill` does the same. */}
              <Badge variant={user.isAdmin ? 'default' : 'secondary'}>
                <Text>{user.isAdmin ? t('home.admin') : user.role}</Text>
              </Badge>
            </AccountRow>
            <Separator />
            <AccountRow label={t('home.status')}>
              <Badge variant={user.isActive ? 'active' : 'ended'}>
                <Text>{user.isActive ? t('home.active') : t('home.inactive')}</Text>
              </Badge>
            </AccountRow>
            <Separator />
            <AccountRow label={t('home.memberSince')}>
              {formatMediumDate(user.createdAt, locale)}
            </AccountRow>
          </>
        )}
      </CardContent>
    </Card>
  );
}
