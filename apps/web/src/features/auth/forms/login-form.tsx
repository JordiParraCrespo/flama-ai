import { Button, FieldGroup, Input } from '@flama/design-system-web';
import {
  AuthField,
  AuthFormError,
  authControlClass,
  authInputClass,
  useZodResolver,
} from '@flama/frontend-web';
import { type LoginDto, loginSchema } from '@flama/shared/schemas/auth';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export function LoginForm({
  defaultEmail,
  isPending,
  error,
  forgotPasswordLink,
  onSubmit,
}: {
  defaultEmail?: string;
  isPending: boolean;
  /** The resolved failure message, if the last attempt failed. */
  error?: string;
  /** The "Forgot password?" link, rendered under the password field. */
  forgotPasswordLink: ReactNode;
  onSubmit: (values: LoginDto) => void;
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: useZodResolver(loginSchema),
    defaultValues: { email: defaultEmail ?? '', password: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-4">
        {error && <AuthFormError>{error}</AuthFormError>}

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

        <AuthField label={t('auth.password')} htmlFor="password" error={errors.password}>
          <Input
            {...register('password')}
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            aria-invalid={Boolean(errors.password)}
            disabled={isPending}
            className={authInputClass}
          />
        </AuthField>

        {/* The design's 21px row, pinned so the column keeps its rhythm. No
            "keep me signed in" box: session lifetime is the API's to decide. */}
        <div className="mb-2 flex h-5.25 items-center justify-end">{forgotPasswordLink}</div>

        <Button type="submit" disabled={isPending} className={authControlClass}>
          {isPending ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
      </FieldGroup>
    </form>
  );
}
