import { Icon } from '@flama/design-system-mobile/icon';
import { MailCheck } from '@flama/design-system-mobile/icons';
import { Text } from '@flama/design-system-mobile/text';
import { useForgotPassword } from '@flama/frontend-core/react';
import {
  AuthBackLink,
  AuthIconCircle,
  AuthLayout,
  AuthLink,
  AuthNote,
  AuthSubtitle,
  AuthTitle,
  useErrorMessage,
} from '@flama/frontend-mobile';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ForgotPasswordForm } from '../forms/forgot-password-form';

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const { mutate, isPending, error } = useForgotPassword();

  // Held locally rather than read off the mutation so that "try another
  // email" can walk the screen back to the request state without the success
  // flag dragging it forward again.
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <AuthLayout legalNoteKey="auth.forgotPassword.legal">
        <AuthIconCircle>
          <Icon as={MailCheck} size={24} className="text-ink-900" />
        </AuthIconCircle>
        <AuthTitle>{t('auth.forgotPassword.successTitle')}</AuthTitle>
        <AuthSubtitle>
          <Trans
            i18nKey="auth.forgotPassword.sentMessage"
            values={{ email: sentTo }}
            components={{ address: <Text className="font-medium text-ink-900" /> }}
          />
        </AuthSubtitle>
        <AuthNote>
          <Trans
            i18nKey="auth.forgotPassword.notReceived"
            components={{ retry: <AuthLink onPress={() => setSentTo(null)} /> }}
          />
        </AuthNote>
        <AuthBackLink />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout legalNoteKey="auth.forgotPassword.legal">
      <AuthTitle>{t('auth.forgotPassword.title')}</AuthTitle>
      <AuthSubtitle>{t('auth.forgotPassword.description')}</AuthSubtitle>

      <ForgotPasswordForm
        isPending={isPending}
        error={error ? resolveError(error, t('auth.forgotPassword.error')).message : undefined}
        onSubmit={({ email }) => mutate(email, { onSuccess: () => setSentTo(email) })}
      />

      <AuthBackLink />
    </AuthLayout>
  );
}
