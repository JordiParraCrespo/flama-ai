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
import { useForgotPassword } from '@flama/frontend/react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { mutate, isPending, isSuccess, error } = useForgotPassword();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutate(form.get('email') as string);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('auth.forgotPassword.title')}</CardTitle>
          <CardDescription>{t('auth.forgotPassword.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {t('auth.forgotPassword.successMessage')}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error instanceof Error ? error.message : t('auth.forgotPassword.error')}
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
                  <Button type="submit" disabled={isPending}>
                    {isPending
                      ? t('auth.forgotPassword.submitting')
                      : t('auth.forgotPassword.submit')}
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
