import { Button, FieldGroup, Input } from '@flama/design-system-web';
import { MailCheck } from '@flama/design-system-web/icons';
import { useForgotPassword } from '@flama/frontend-core/react';
import {
  AuthBackLink,
  AuthField,
  AuthFormError,
  AuthIconCircle,
  AuthNote,
  AuthSubtitle,
  AuthTitle,
  authControlClass,
  authInputClass,
  useErrorMessage,
  useZodResolver,
} from '@flama/frontend-web';
import { type ForgotPasswordDto, forgotPasswordSchema } from '@flama/shared/schemas/auth';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const { mutate, isPending, error } = useForgotPassword();

  // Held locally rather than read off the mutation so that "try another
  // email" can walk the screen back to the request state without the success
  // flag dragging it forward again.
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordDto>({
    resolver: useZodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(({ email }) =>
    mutate(email, { onSuccess: () => setSentTo(email) }),
  );

  if (sentTo) {
    return (
      <>
        <AuthIconCircle>
          <MailCheck />
        </AuthIconCircle>
        <AuthTitle>{t('auth.forgotPassword.successTitle')}</AuthTitle>
        <AuthSubtitle>
          <Trans
            i18nKey="auth.forgotPassword.sentMessage"
            values={{ email: sentTo }}
            components={{
              address: <strong className="font-medium text-ink-900" />,
            }}
          />
        </AuthSubtitle>
        <AuthNote>
          <Trans
            i18nKey="auth.forgotPassword.notReceived"
            components={{
              retry: (
                <button
                  type="button"
                  onClick={() => setSentTo(null)}
                  className="text-accent-blue transition-opacity hover:opacity-80"
                />
              ),
            }}
          />
        </AuthNote>
        <AuthBackLink />
      </>
    );
  }

  return (
    <>
      <AuthTitle>{t('auth.forgotPassword.title')}</AuthTitle>
      <AuthSubtitle>{t('auth.forgotPassword.description')}</AuthSubtitle>

      <form onSubmit={onSubmit} noValidate>
        <FieldGroup className="gap-4">
          {error && (
            <AuthFormError>
              {resolveError(error, t('auth.forgotPassword.error')).message}
            </AuthFormError>
          )}

          <AuthField label={t('auth.email')} htmlFor="email" error={errors.email}>
            <Input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder')}
              aria-invalid={Boolean(errors.email)}
              disabled={isPending}
              className={authInputClass}
            />
          </AuthField>

          <Button type="submit" disabled={isPending} className={authControlClass}>
            {isPending ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
          </Button>
        </FieldGroup>
      </form>

      <AuthBackLink />
    </>
  );
}
