import { Button } from '@flama/design-system-mobile/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-mobile/card';
import { Input } from '@flama/design-system-mobile/input';
import { Label } from '@flama/design-system-mobile/label';
import { Text } from '@flama/design-system-mobile/text';
import { useLogin, useSocialLogin } from '@flama/frontend/react';
import { loginSchema } from '@flama/shared';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { LanguageSwitcher } from '../../components/language-switcher';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const login = useLogin({
    onSuccess: () => {
      router.replace('/(app)');
    },
    onError: (error) => {
      Alert.alert(t('auth.login.failedTitle'), error.message ?? t('auth.login.invalidCredentials'));
    },
  });

  const social = useSocialLogin({
    onSuccess: () => {
      router.replace('/(app)');
    },
    onError: (error) => {
      Alert.alert(t('auth.login.failedTitle'), error.message ?? t('auth.login.failedMessage'));
    },
  });

  const handleLogin = () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      Alert.alert(t('validation.title'), result.error.errors[0].message);
      return;
    }
    login.mutate(result.data);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-6"
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('auth.login.title')}</CardTitle>
            <CardDescription>{t('auth.login.description')}</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label nativeID="email">{t('auth.email')}</Label>
              <Input
                placeholder={t('auth.emailPlaceholder')}
                aria-labelledby="email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
            <View className="gap-2">
              <Label nativeID="password">{t('auth.password')}</Label>
              <Input
                placeholder={t('auth.passwordPlaceholder')}
                aria-labelledby="password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
              />
            </View>
            <Button onPress={handleLogin} disabled={login.isPending} className="mt-2">
              <Text>{login.isPending ? t('auth.login.submitting') : t('auth.login.submit')}</Text>
            </Button>
            <View className="flex-row items-center gap-3 py-1">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-xs uppercase text-muted-foreground">
                {t('common.orContinueWith')}
              </Text>
              <View className="h-px flex-1 bg-border" />
            </View>
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={social.isPending}
                onPress={() => social.mutate('google')}
              >
                <Text>{t('common.google')}</Text>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={social.isPending}
                onPress={() => social.mutate('github')}
              >
                <Text>{t('common.github')}</Text>
              </Button>
            </View>
            <View className="flex-row items-center justify-center gap-1">
              <Text className="text-sm text-muted-foreground">{t('auth.login.noAccount')}</Text>
              <Link href="/(auth)/register" asChild>
                <Button variant="link" size="sm" className="px-1">
                  <Text>{t('auth.login.signUp')}</Text>
                </Button>
              </Link>
            </View>
            <Link href="/(auth)/forgot-password" asChild>
              <Button variant="link" size="sm">
                <Text>{t('auth.login.forgotPassword')}</Text>
              </Button>
            </Link>
            <LanguageSwitcher className="mt-2" />
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
