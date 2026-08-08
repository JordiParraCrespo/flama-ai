import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
} from '@flama/design-system-web';
import { useLogin } from '@flama/frontend/react';
import { type LoginDto, loginSchema } from '@flama/shared/schemas/auth';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SocialLoginButtons } from '@/components/social-login-buttons';
import { useErrorMessage } from '@/lib/use-error-message';
import { useZodResolver } from '@/lib/use-zod-resolver';

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: (search.redirect as string) || undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { mutate, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: useZodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    mutate(values, {
      onSuccess: () => {
        navigate({ to: redirectTo ?? '/dashboard' });
      },
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('auth.login.title')}</CardTitle>
          <CardDescription>{t('auth.login.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {resolveError(error, t('auth.login.invalidCredentials')).message}
                </div>
              )}
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
                <Input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('auth.emailPlaceholder')}
                  aria-invalid={Boolean(errors.email)}
                  disabled={isPending}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
                  <Link
                    to="/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>
                <Input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('auth.passwordPlaceholder')}
                  aria-invalid={Boolean(errors.password)}
                  disabled={isPending}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t('auth.login.submitting') : t('auth.login.submit')}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <SocialLoginButtons disabled={isPending} />
        </CardContent>
      </Card>
      <div className="text-center text-sm">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="underline underline-offset-4 hover:text-primary">
          {t('auth.login.signUp')}
        </Link>
      </div>
    </div>
  );
}
