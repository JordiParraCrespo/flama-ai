import { Button, Checkbox, FieldGroup, Input, Label } from '@flama/design-system-web';
import type { TwoFactorMethod, VerifyTwoFactorParams } from '@flama/frontend-core';
import { type TwoFactorChallengeDto, twoFactorChallengeSchema } from '@flama/shared/schemas/auth';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useZodResolver } from '../../forms';
import {
  AuthField,
  AuthFormError,
  authControlClass,
  authInputClass,
} from '../components/auth-primitives';

/**
 * The second step of a password sign-in on an account with two-factor on: a
 * code from the authenticator app, or a backup code when the app is out of
 * reach. Both web apps' login screens show it when `useLogin` rejects with
 * `isTwoFactorRequired`, and hand the values to `useVerifyTwoFactor`.
 */
export function TwoFactorChallengeForm({
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  isPending: boolean;
  /** The resolved failure message, if the last attempt failed. */
  error?: string;
  onSubmit: (values: VerifyTwoFactorParams) => void;
  /** Back to the password step, e.g. to sign in as somebody else. */
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [method, setMethod] = useState<TwoFactorMethod>('totp');

  const {
    register,
    control,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<TwoFactorChallengeDto>({
    resolver: useZodResolver(twoFactorChallengeSchema),
    defaultValues: { code: '', trustDevice: false },
  });

  const switchMethod = () => {
    setMethod(method === 'totp' ? 'backup-code' : 'totp');
    resetField('code');
  };

  return (
    <form onSubmit={handleSubmit((values) => onSubmit({ ...values, method }))} noValidate>
      <FieldGroup className="gap-4">
        {error && <AuthFormError>{error}</AuthFormError>}

        {method === 'totp' ? (
          <AuthField label={t('auth.twoFactor.code')} htmlFor="two-factor-code" error={errors.code}>
            <Input
              {...register('code')}
              id="two-factor-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              aria-invalid={Boolean(errors.code)}
              disabled={isPending}
              className={authInputClass}
            />
          </AuthField>
        ) : (
          <AuthField
            label={t('auth.twoFactor.backupCode')}
            htmlFor="two-factor-backup-code"
            error={errors.code}
          >
            <Input
              {...register('code')}
              id="two-factor-backup-code"
              autoComplete="off"
              spellCheck={false}
              placeholder="xxxxx-xxxxx"
              aria-invalid={Boolean(errors.code)}
              disabled={isPending}
              className={authInputClass}
            />
          </AuthField>
        )}

        <Controller
          control={control}
          name="trustDevice"
          render={({ field }) => (
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="two-factor-trust-device"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={isPending}
              />
              <Label htmlFor="two-factor-trust-device" className="font-normal">
                {t('auth.twoFactor.trustDevice')}
              </Label>
            </div>
          )}
        />

        <Button type="submit" disabled={isPending} className={authControlClass}>
          {isPending ? t('auth.twoFactor.verifying') : t('auth.twoFactor.verify')}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={switchMethod}
            disabled={isPending}
            className="text-accent-blue transition-opacity hover:opacity-80"
          >
            {method === 'totp' ? t('auth.twoFactor.useBackupCode') : t('auth.twoFactor.useApp')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="text-ink-600 transition-colors hover:text-ink-900"
          >
            {t('auth.twoFactor.back')}
          </button>
        </div>
      </FieldGroup>
    </form>
  );
}
