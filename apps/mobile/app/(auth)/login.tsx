import { Button } from '@flama/design-system-mobile/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-mobile/card';
import { Input } from '@flama/design-system-mobile/input';
import { Text } from '@flama/design-system-mobile/text';
import { useLogin, useSocialLogin } from '@flama/frontend/react';
import { type LoginDto, loginSchema } from '@flama/shared';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { FormField } from '../../components/form-field';
import { LanguageSwitcher } from '../../components/language-switcher';
import { useZodResolver } from '../../lib/use-zod-resolver';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const { control, handleSubmit } = useForm<LoginDto>({
    resolver: useZodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

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

  const onSubmit = handleSubmit((values) => login.mutate(values));

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
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <FormField
                  label={t('auth.email')}
                  nativeID="email"
                  error={fieldState.error?.message}
                >
                  <Input
                    placeholder={t('auth.emailPlaceholder')}
                    aria-labelledby="email"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                  />
                </FormField>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <FormField
                  label={t('auth.password')}
                  nativeID="password"
                  error={fieldState.error?.message}
                >
                  <Input
                    placeholder={t('auth.passwordPlaceholder')}
                    aria-labelledby="password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    secureTextEntry
                    autoComplete="password"
                    textContentType="password"
                  />
                </FormField>
              )}
            />
            <Button onPress={onSubmit} disabled={login.isPending} className="mt-2">
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
