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
import { useRegister } from '@flama/frontend/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_auth/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutate, isPending, error } = useRegister();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    mutate(
      {
        firstName: form.get('firstName') as string,
        lastName: form.get('lastName') as string,
        email: form.get('email') as string,
        password: form.get('password') as string,
      },
      {
        onSuccess: () => {
          navigate({ to: '/login' });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('auth.register.title')}</CardTitle>
          <CardDescription>{t('auth.register.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error instanceof Error ? error.message : t('auth.register.failed')}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="firstName">{t('auth.firstName')}</FieldLabel>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    required
                    disabled={isPending}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">{t('auth.lastName')}</FieldLabel>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    required
                    disabled={isPending}
                  />
                </Field>
              </div>
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
                <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('auth.register.passwordPlaceholder')}
                  required
                  disabled={isPending}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t('auth.register.submitting') : t('auth.register.submit')}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-sm">
        {t('auth.register.hasAccount')}{' '}
        <Link to="/login" className="underline underline-offset-4 hover:text-primary">
          {t('auth.register.signIn')}
        </Link>
      </div>
    </div>
  );
}
