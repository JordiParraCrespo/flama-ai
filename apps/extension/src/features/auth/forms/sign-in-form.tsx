import { Button, FieldGroup, Input } from '@flama/design-system-web';
import {
  AuthField,
  AuthFormError,
  authControlClass,
  authInputClass,
  PasswordInput,
  useZodResolver,
} from '@flama/frontend-web';
import { type LoginDto, loginSchema } from '@flama/shared/schemas/auth';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/** Email and password. Props in, `onSubmit` out; the screen above owns the mutation. */
export function SignInForm({
  isPending,
  error,
  onForgotPassword,
  onSubmit,
}: {
  isPending: boolean;
  /** The resolved failure message, if the last attempt failed. */
  error?: string;
  onForgotPassword: () => void;
  onSubmit: (values: LoginDto) => void;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: useZodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {error && <AuthFormError>{error}</AuthFormError>}

        <AuthField label={t('auth.email')} htmlFor="email" error={errors.email}>
          <Input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder={t('auth.emailPlaceholder')}
            aria-invalid={Boolean(errors.email)}
            disabled={isPending}
            className={authInputClass}
          />
        </AuthField>

        <AuthField label={t('auth.password')} htmlFor="password" error={errors.password}>
          <PasswordInput
            {...register('password')}
            id="password"
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            aria-invalid={Boolean(errors.password)}
            disabled={isPending}
            className={authInputClass}
          />
        </AuthField>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-accent-blue transition-opacity hover:opacity-80"
          >
            {t('auth.login.forgotPassword')}
          </button>
        </div>

        <Button type="submit" disabled={isPending} className={authControlClass}>
          {isPending ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
      </FieldGroup>
    </form>
  );
}
