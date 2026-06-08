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
import { useResetPassword } from '@flama/frontend/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: (search: Record<string, unknown>): { token?: string; error?: string } => ({
    token: (search.token as string) || undefined,
    error: (search.error as string) || undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token, error: linkError } = Route.useSearch();
  const { mutate, isPending, error } = useResetPassword();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = new FormData(e.currentTarget);
    mutate(
      { token, password: form.get('password') as string },
      { onSuccess: () => navigate({ to: '/login' }) },
    );
  }

  const invalidLink = !token || Boolean(linkError);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('auth.resetPassword.title')}</CardTitle>
          <CardDescription>{t('auth.resetPassword.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {invalidLink ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t('auth.resetPassword.invalidMessage')}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error instanceof Error ? error.message : t('auth.resetPassword.error')}
                  </div>
                )}
                <Field>
                  <FieldLabel htmlFor="password">{t('auth.resetPassword.newPassword')}</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                    required
                    minLength={8}
                    disabled={isPending}
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={isPending}>
                    {isPending
                      ? t('auth.resetPassword.submitting')
                      : t('auth.resetPassword.submit')}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
      <div className="text-center text-sm">
        <Link to="/login" className="underline underline-offset-4 hover:text-primary">
          {t('auth.forgotPassword.backToSignIn')}
        </Link>
      </div>
    </div>
  );
}
