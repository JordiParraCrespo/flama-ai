import { Avatar, AvatarFallback } from '@flama/design-system-mobile/avatar';
import { Badge } from '@flama/design-system-mobile/badge';
import { Button } from '@flama/design-system-mobile/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-mobile/card';
import { Icon } from '@flama/design-system-mobile/icon';
import type { LucideIcon } from '@flama/design-system-mobile/icons';
import { Activity, Server, Users, Zap } from '@flama/design-system-mobile/icons';
import { Separator } from '@flama/design-system-mobile/separator';
import { Skeleton } from '@flama/design-system-mobile/skeleton';
import { Text } from '@flama/design-system-mobile/text';
import { useLogout, useProfile } from '@flama/frontend/react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { LanguageSwitcher } from '../../components/language-switcher';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: user, isLoading, isFetching, refetch } = useProfile();

  const logout = useLogout({
    onSuccess: () => {
      router.replace('/(auth)/login');
    },
  });

  const stats: Array<{
    key: string;
    label: string;
    value: string;
    icon: LucideIcon;
  }> = [
    {
      key: 'totalUsers',
      label: t('home.totalUsers'),
      value: '128',
      icon: Users,
    },
    {
      key: 'activeSessions',
      label: t('home.activeSessions'),
      value: '24',
      icon: Activity,
    },
    { key: 'apiCalls', label: t('home.apiCalls'), value: '1,420', icon: Zap },
    { key: 'uptime', label: t('home.uptime'), value: '99.9%', icon: Server },
  ];

  return (
    <ScrollView contentContainerClassName="p-6 gap-6">
      <View className="flex-row items-center gap-4">
        <Avatar alt={user?.fullName ?? ''} className="size-14">
          <AvatarFallback>
            <Text className="text-lg font-semibold text-foreground">
              {isLoading ? '' : initials(user?.firstName, user?.lastName)}
            </Text>
          </AvatarFallback>
        </Avatar>
        <View className="flex-1 gap-1">
          {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <Text className="text-2xl font-bold text-foreground" numberOfLines={1}>
              {user?.firstName
                ? t('home.greeting', { name: user.firstName })
                : t('home.greetingFallback')}
            </Text>
          )}
          <Text className="text-sm text-muted-foreground">{t('home.subtitle')}</Text>
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-muted-foreground">{t('home.overview')}</Text>
        <View className="flex-row flex-wrap gap-3">
          {stats.map((stat) => (
            <Card key={stat.key} className="min-w-[45%] flex-1">
              <CardHeader className="gap-2">
                <View className="flex-row items-center justify-between">
                  <CardDescription>{stat.label}</CardDescription>
                  <Icon as={stat.icon} className="text-muted-foreground" size={16} />
                </View>
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </View>
      </View>

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
              <Text className="text-sm text-muted-foreground">{t('home.accountUnavailable')}</Text>
              <Button variant="outline" onPress={() => refetch()} disabled={isFetching}>
                <Text>{isFetching ? t('home.retrying') : t('home.retry')}</Text>
              </Button>
            </View>
          ) : (
            <>
              <AccountRow label={t('home.email')} value={user.email} />
              <Separator />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">{t('home.role')}</Text>
                <Badge variant={user.isAdmin ? 'default' : 'secondary'}>
                  <Text>{user.isAdmin ? t('home.admin') : user.role}</Text>
                </Badge>
              </View>
              <Separator />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">{t('home.status')}</Text>
                <Badge variant={user.isActive ? 'default' : 'destructive'}>
                  <Text>{user.isActive ? t('home.active') : t('home.inactive')}</Text>
                </Badge>
              </View>
              <Separator />
              <AccountRow label={t('home.memberSince')} value={formatDate(user.createdAt)} />
            </>
          )}
        </CardContent>
      </Card>

      <LanguageSwitcher />

      <Button variant="destructive" onPress={() => logout.mutate()} disabled={logout.isPending}>
        <Text>{logout.isPending ? t('home.signingOut') : t('home.signOut')}</Text>
      </Button>
    </ScrollView>
  );
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-right text-sm font-medium text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function initials(firstName?: string, lastName?: string): string {
  const first = firstName?.trim().charAt(0) ?? '';
  const last = lastName?.trim().charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
