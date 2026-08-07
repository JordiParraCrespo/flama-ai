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
import { useResetPassword } from '@flama/frontend/react';
import { resetPasswordSchema } from '@flama/shared/schemas/auth';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { useZodResolver } from '@/lib/use-zod-resolver';

/** The token rides in the URL, so only the password is user input. */
const newPasswordSchema = resetPasswordSchema.pick({ password: true });

type NewPasswordValues = z.infer<typeof newPasswordSchema>;

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordValues>({
    resolver: useZodResolver(newPasswordSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = handleSubmit(({ password }) => {
    if (!token) return;
    mutate({ token, password }, { onSuccess: () => navigate({ to: '/login' }) });
  });

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
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup>
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error instanceof Error ? error.message : t('auth.resetPassword.error')}
                  </div>
                )}
                <Field data-invalid={Boolean(errors.password)}>
                  <FieldLabel htmlFor="password">{t('auth.resetPassword.newPassword')}</FieldLabel>
                  <Input
                    {...register('password')}
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                    aria-invalid={Boolean(errors.password)}
                    disabled={isPending}
                  />
                  <FieldError errors={[errors.password]} />
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
