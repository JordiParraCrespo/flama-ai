import { Text } from '@flama/design-system-mobile/text';
import { useLogin } from '@flama/frontend-core/react';
import {
  AuthFooterNote,
  AuthLayout,
  AuthLink,
  AuthSubtitle,
  AuthTitle,
  SocialLoginButtons,
  useErrorMessage,
} from '@flama/frontend-mobile';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { LoginForm } from '../forms/login-form';

export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const resolveError = useErrorMessage();
  const { mutate, isPending, error } = useLogin();

  const toApp = () => router.replace('/(app)');

  return (
    <AuthLayout>
      <AuthTitle>{t('auth.login.title')}</AuthTitle>
      <AuthSubtitle>{t('auth.login.description')}</AuthSubtitle>

      <LoginForm
        isPending={isPending}
        error={error ? resolveError(error, t('auth.login.invalidCredentials')).message : undefined}
        forgotPasswordLink={
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <AuthLink>{t('auth.login.forgotPassword')}</AuthLink>
            </Pressable>
          </Link>
        }
        onSubmit={(values) => mutate(values, { onSuccess: toApp })}
      />

      <SocialLoginButtons disabled={isPending} onSuccess={toApp} />

      <AuthFooterNote>
        <Text className="text-sm text-ink-600">{t('auth.login.noAccount')}</Text>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <AuthLink>{t('auth.login.signUp')}</AuthLink>
          </Pressable>
        </Link>
      </AuthFooterNote>
    </AuthLayout>
  );
}
