import { Button } from '@flama/design-system-mobile/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-mobile/card';
import { Text } from '@flama/design-system-mobile/text';
import { useLogout } from '@flama/frontend/react';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { LanguageSwitcher } from '../../components/language-switcher';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [count, setCount] = React.useState(0);

  const logout = useLogout({
    onSuccess: () => {
      router.replace('/(auth)/login');
    },
  });

  return (
    <ScrollView contentContainerClassName="p-6 gap-6">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-foreground">{t('home.title')}</Text>
        <Text className="text-base text-muted-foreground">{t('home.subtitle')}</Text>
      </View>

      <Card>
        <CardHeader>
          <CardTitle>{t('home.counter')}</CardTitle>
          <CardDescription>{t('home.counterDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <Text className="text-center text-4xl font-bold text-foreground">{count}</Text>
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={() => setCount((c) => c - 1)}>
              <Text>-</Text>
            </Button>
            <Button className="flex-1" onPress={() => setCount((c) => c + 1)}>
              <Text>+</Text>
            </Button>
          </View>
          <Button variant="secondary" onPress={() => setCount(0)}>
            <Text>{t('home.reset')}</Text>
          </Button>
        </CardContent>
      </Card>

      <LanguageSwitcher />

      <Button variant="destructive" onPress={() => logout.mutate()} disabled={logout.isPending}>
        <Text>{logout.isPending ? t('home.signingOut') : t('home.signOut')}</Text>
      </Button>
    </ScrollView>
  );
}
