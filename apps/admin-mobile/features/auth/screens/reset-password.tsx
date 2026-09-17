import { Button } from '@flama/design-system-mobile/button';
import { Icon } from '@flama/design-system-mobile/icon';
import { ShieldAlert, ShieldCheck } from '@flama/design-system-mobile/icons';
import { Text } from '@flama/design-system-mobile/text';
import { useResetPassword } from '@flama/frontend-core/react';
import {
  AuthBackLink,
  AuthIconCircle,
  AuthLayout,
  AuthSubtitle,
  AuthTitle,
  authControlClass,
  useErrorMessage,
} from '@flama/frontend-mobile';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResetPasswordForm } from '../forms/reset-password-form';
import { CONTROL_PLANE_BRAND } from '../lib/brand';

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { mutate, isPending, error } = useResetPassword();
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthLayout brandLabel={CONTROL_PLANE_BRAND} legalNoteKey="auth.resetPassword.legal">
        <AuthIconCircle>
          <Icon as={ShieldAlert} size={24} className="text-ink-900" />
        </AuthIconCircle>
        <AuthTitle>{t('auth.resetPassword.invalidTitle')}</AuthTitle>
        <AuthSubtitle>{t('auth.resetPassword.invalidMessage')}</AuthSubtitle>
        <Link href="/(auth)/forgot-password" asChild>
          <Button className={authControlClass}>
            <Text>{t('auth.resetPassword.requestNewLink')}</Text>
          </Button>
        </Link>
        <AuthBackLink />
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout brandLabel={CONTROL_PLANE_BRAND} legalNoteKey="auth.resetPassword.legal">
        <AuthIconCircle>
          <Icon as={ShieldCheck} size={24} className="text-ink-900" />
        </AuthIconCircle>
        <AuthTitle>{t('auth.resetPassword.successTitle')}</AuthTitle>
        <AuthSubtitle>{t('auth.resetPassword.successMessage')}</AuthSubtitle>
        <Link href="/(auth)/login" asChild>
          <Button className={authControlClass}>
            <Text>{t('auth.resetPassword.continue')}</Text>
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout brandLabel={CONTROL_PLANE_BRAND} legalNoteKey="auth.resetPassword.legal">
      <AuthTitle>{t('auth.resetPassword.title')}</AuthTitle>
      <AuthSubtitle>{t('auth.resetPassword.description')}</AuthSubtitle>

      <ResetPasswordForm
        isPending={isPending}
        error={error ? resolveError(error, t('auth.resetPassword.error')).message : undefined}
        onSubmit={({ password }) => mutate({ token, password }, { onSuccess: () => setDone(true) })}
      />
    </AuthLayout>
  );
}
