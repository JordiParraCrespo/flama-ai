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
import { useForgotPassword } from '@flama/frontend/react';
import { type ForgotPasswordDto, forgotPasswordSchema } from '@flama/shared/schemas/auth';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useZodResolver } from '@/lib/use-zod-resolver';

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { mutate, isPending, isSuccess, error } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordDto>({
    resolver: useZodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(({ email }) => mutate(email));

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
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup>
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error instanceof Error ? error.message : t('auth.forgotPassword.error')}
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
