import { Button } from '@flama/design-system-mobile/button';
import { Checkbox } from '@flama/design-system-mobile/checkbox';
import { Input } from '@flama/design-system-mobile/input';
import { Label } from '@flama/design-system-mobile/label';
import { Text } from '@flama/design-system-mobile/text';
import type { TwoFactorMethod, VerifyTwoFactorParams } from '@flama/frontend-core';
import { type TwoFactorChallengeDto, twoFactorChallengeSchema } from '@flama/shared';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { FormField, useZodResolver } from '../../forms';
import {
  AuthFormError,
  AuthLink,
  authControlClass,
  authInputClass,
} from '../components/auth-primitives';

export interface TwoFactorChallengeFormProps {
  onSubmit: (values: VerifyTwoFactorParams) => void;
  /** Back to the password step, e.g. to sign in as somebody else. */
  onCancel: () => void;
  isPending: boolean;
  error?: string;
}

/**
 * The second step of a password sign-in on an account with two-factor on: a
 * code from the authenticator app, or a backup code when the app is out of
 * reach. Mirrors the web kit's form; both apps' login screens show it when
 * `useLogin` rejects with `isTwoFactorRequired`.
 */
export function TwoFactorChallengeForm({
  onSubmit,
  onCancel,
  isPending,
  error,
}: TwoFactorChallengeFormProps) {
  const { t } = useTranslation();
  const [method, setMethod] = useState<TwoFactorMethod>('totp');
  const { control, handleSubmit, resetField } = useForm<TwoFactorChallengeDto>({
    resolver: useZodResolver(twoFactorChallengeSchema),
    defaultValues: { code: '', trustDevice: false },
  });

  const submit = handleSubmit((values) => onSubmit({ ...values, method }));
  const switchMethod = () => {
    setMethod(method === 'totp' ? 'backup-code' : 'totp');
    resetField('code');
  };

  return (
    <View className="gap-4">
      {error ? <AuthFormError>{error}</AuthFormError> : null}
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <FormField
            label={method === 'totp' ? t('auth.twoFactor.code') : t('auth.twoFactor.backupCode')}
            nativeID="two-factor-code"
            error={fieldState.error?.message}
          >
            <Input
              className={authInputClass}
              placeholder={method === 'totp' ? '123456' : 'xxxxx-xxxxx'}
              aria-labelledby="two-factor-code"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!isPending}
              autoCapitalize="none"
              autoCorrect={false}
              {...(method === 'totp'
                ? {
                    keyboardType: 'number-pad' as const,
                    autoComplete: 'one-time-code' as const,
                    textContentType: 'oneTimeCode' as const,
                    maxLength: 6,
                  }
                : {})}
            />
          </FormField>
        )}
      />
      <Controller
        control={control}
        name="trustDevice"
        render={({ field }) => (
          <View className="flex-row items-center gap-2.5">
            <Checkbox
              aria-labelledby="two-factor-trust-device"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isPending}
            />
            <Label nativeID="two-factor-trust-device" onPress={() => field.onChange(!field.value)}>
              {t('auth.twoFactor.trustDevice')}
            </Label>
          </View>
        )}
      />
      <Button onPress={submit} disabled={isPending} className={authControlClass}>
        <Text>{isPending ? t('auth.twoFactor.verifying') : t('auth.twoFactor.verify')}</Text>
      </Button>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={switchMethod} disabled={isPending}>
          <AuthLink>
            {method === 'totp' ? t('auth.twoFactor.useBackupCode') : t('auth.twoFactor.useApp')}
          </AuthLink>
        </Pressable>
        <Pressable onPress={onCancel} disabled={isPending}>
          <Text className="text-sm text-ink-600">{t('auth.twoFactor.back')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
