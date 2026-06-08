import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
} from '@flama/design-system-web';
import { useLogin, useSocialLogin } from '@flama/frontend/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: (search.redirect as string) || undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { mutate, isPending, error } = useLogin();
  const social = useSocialLogin();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate({ to: redirectTo ?? '/dashboard' });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('auth.login.title')}</CardTitle>
          <CardDescription>{t('auth.login.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error instanceof Error ? error.message : t('auth.login.invalidCredentials')}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  disabled={isPending}
                />
              </Field>
              <Field>
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
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  disabled={isPending}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t('auth.login.submitting') : t('auth.login.submit')}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t('common.orContinueWith')}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              type="button"
              disabled={isPending || social.isPending}
              onClick={() => social.mutate('google')}
            >
              {t('common.google')}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={isPending || social.isPending}
              onClick={() => social.mutate('github')}
            >
              {t('common.github')}
            </Button>
          </div>
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
