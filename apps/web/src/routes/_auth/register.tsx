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
import { useRegister } from '@flama/frontend/react';
import { type RegisterDto, registerSchema } from '@flama/shared/schemas/auth';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useZodResolver } from '@/lib/use-zod-resolver';

export const Route = createFileRoute('/_auth/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutate, isPending, error } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDto>({
    resolver: useZodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    mutate(values, {
      onSuccess: () => {
        navigate({ to: '/login' });
      },
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('auth.register.title')}</CardTitle>
          <CardDescription>{t('auth.register.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error instanceof Error ? error.message : t('auth.register.failed')}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={Boolean(errors.firstName)}>
                  <FieldLabel htmlFor="firstName">{t('auth.firstName')}</FieldLabel>
                  <Input
                    {...register('firstName')}
                    id="firstName"
                    autoComplete="given-name"
                    placeholder="John"
                    aria-invalid={Boolean(errors.firstName)}
                    disabled={isPending}
                  />
                  <FieldError errors={[errors.firstName]} />
                </Field>
                <Field data-invalid={Boolean(errors.lastName)}>
                  <FieldLabel htmlFor="lastName">{t('auth.lastName')}</FieldLabel>
                  <Input
                    {...register('lastName')}
                    id="lastName"
                    autoComplete="family-name"
                    placeholder="Doe"
                    aria-invalid={Boolean(errors.lastName)}
                    disabled={isPending}
                  />
                  <FieldError errors={[errors.lastName]} />
                </Field>
              </div>
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
                <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
                <Input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('auth.register.passwordPlaceholder')}
                  aria-invalid={Boolean(errors.password)}
                  disabled={isPending}
                />
                <FieldError errors={[errors.password]} />
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
