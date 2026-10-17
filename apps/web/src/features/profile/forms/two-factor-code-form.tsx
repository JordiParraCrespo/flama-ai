import { Field, FieldError, FieldLabel, Input } from '@flama/design-system-web';
import { useZodResolver } from '@flama/frontend-web';
import { type TwoFactorCodeDto, twoFactorCodeSchema } from '@flama/shared/schemas/auth';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/**
 * The first code from the authenticator app, which proves it was set up
 * right and turns two-factor on. The dialog's footer button submits it.
 */
export function TwoFactorCodeForm({
  id,
  isPending,
  onSubmit,
}: {
  id: string;
  isPending: boolean;
  onSubmit: (values: TwoFactorCodeDto) => void;
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorCodeDto>({
    resolver: useZodResolver(twoFactorCodeSchema),
    defaultValues: { code: '' },
  });

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field data-invalid={Boolean(errors.code)}>
        <FieldLabel htmlFor={`${id}-code`}>{t('profile.twoFactor.code')}</FieldLabel>
        <Input
          {...register('code')}
          id={`${id}-code`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          aria-invalid={Boolean(errors.code)}
          disabled={isPending}
        />
        <FieldError errors={[errors.code]} />
      </Field>
    </form>
  );
}
