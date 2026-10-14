import { Field, FieldError, FieldLabel, Input } from '@flama/design-system-web';
import { useZodResolver } from '@flama/frontend-web';
import { type TwoFactorPasswordDto, twoFactorPasswordSchema } from '@flama/shared/schemas/auth';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/**
 * The password re-entered before two-factor changes: setting it up, turning
 * it off, or replacing the backup codes. The dialog renders the submit button
 * in its footer and points it at `id`.
 */
export function TwoFactorPasswordForm({
  id,
  isPending,
  onSubmit,
}: {
  id: string;
  isPending: boolean;
  onSubmit: (values: TwoFactorPasswordDto) => void;
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorPasswordDto>({
    resolver: useZodResolver(twoFactorPasswordSchema),
    defaultValues: { password: '' },
  });

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field data-invalid={Boolean(errors.password)}>
        <FieldLabel htmlFor={`${id}-password`}>{t('profile.twoFactor.password')}</FieldLabel>
        <Input
          {...register('password')}
          id={`${id}-password`}
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          disabled={isPending}
        />
        <FieldError errors={[errors.password]} />
      </Field>
    </form>
  );
}
