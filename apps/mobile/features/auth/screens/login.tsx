import { Text } from '@flama/design-system-mobile/text';
import {
  isTwoFactorRequired,
  useErrorMessage,
  useLogin,
  useVerifyTwoFactor,
} from '@flama/frontend-core/react';
import {
  AuthFooterNote,
  AuthLayout,
  AuthLink,
  AuthSubtitle,
  AuthTitle,
  LoginForm,
  SocialLoginButtons,
  TwoFactorChallengeForm,
} from '@flama/frontend-mobile';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const resolveError = useErrorMessage();
  const { mutate, isPending, error, reset } = useLogin();
  const verify = useVerifyTwoFactor();

  const toApp = () => router.replace('/(app)');

  // The password was right and the account has two-factor on: the sign-in
  // owes a code. Derived from the mutation, so "back" is forgetting it.
  if (isTwoFactorRequired(error)) {
    return (
      <AuthLayout>
        <AuthTitle>{t('auth.twoFactor.title')}</AuthTitle>
        <AuthSubtitle>{t('auth.twoFactor.description')}</AuthSubtitle>

        <TwoFactorChallengeForm
          isPending={verify.isPending}
          error={
            verify.error
              ? resolveError(verify.error, t('auth.twoFactor.invalidCode')).message
              : undefined
          }
          onSubmit={(values) => verify.mutate(values, { onSuccess: toApp })}
          onCancel={() => {
            verify.reset();
            reset();
          }}
        />
      </AuthLayout>
    );
  }

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
