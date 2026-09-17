import { Text } from '@flama/design-system-mobile/text';
import { useRegister } from '@flama/frontend-consumer/react';
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
import { Alert, Pressable } from 'react-native';
import { RegisterForm } from '../forms/register-form';

export function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const resolveError = useErrorMessage();
  const { mutate, isPending, error } = useRegister();

  return (
    <AuthLayout>
      <AuthTitle>{t('auth.register.title')}</AuthTitle>
      <AuthSubtitle>{t('auth.register.description')}</AuthSubtitle>

      <RegisterForm
        isPending={isPending}
        error={error ? resolveError(error, t('auth.register.failed')).message : undefined}
        onSubmit={(values) =>
          mutate(values, {
            // Failures render inline above the first field; this one stays a
            // native alert because it is a terminal confirmation — the screen
            // it belongs to is already being replaced by the sign-in screen.
            onSuccess: () =>
              Alert.alert(t('auth.register.successTitle'), t('auth.register.successMessage'), [
                { text: 'OK', onPress: () => router.replace('/(auth)/login') },
              ]),
          })
        }
      />

      {/* The one place a provider identity may become an account: these pass
          `sign-up`, which is what lifts the API's refusal. Without them the
          person the login screen sent here has no way to finish with the
          provider they started with. */}
      <SocialLoginButtons
        disabled={isPending}
        intent="sign-up"
        onSuccess={() => router.replace('/(app)')}
      />

      <AuthFooterNote>
        <Text className="text-sm text-ink-600">{t('auth.register.hasAccount')}</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <AuthLink>{t('auth.register.signIn')}</AuthLink>
          </Pressable>
        </Link>
      </AuthFooterNote>
    </AuthLayout>
  );
}
