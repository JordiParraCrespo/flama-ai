import { Button } from '@flama/design-system-mobile/button';
import { Input } from '@flama/design-system-mobile/input';
import { Text } from '@flama/design-system-mobile/text';
import {
  authControlClass,
  authInputClass,
  FormField,
  useZodResolver,
} from '@flama/frontend-mobile';
import {
  type CreateOrganizationDto,
  createOrganizationSchema,
} from '@flama/shared/schemas/organization';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

interface CreateOrganizationFormProps {
  /** Disabled while any sibling action (accepting an invitation) is in flight. */
  disabled: boolean;
  isPending: boolean;
  onSubmit: (values: CreateOrganizationDto) => void;
}

export function CreateOrganizationForm({
  disabled,
  isPending,
  onSubmit,
}: CreateOrganizationFormProps) {
  const { t } = useTranslation();

  const { control, handleSubmit } = useForm<CreateOrganizationDto>({
    resolver: useZodResolver(createOrganizationSchema),
    defaultValues: { name: '' },
  });

  return (
    <View className="gap-4">
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <FormField
            label={t('onboarding.create.name')}
            nativeID="organizationName"
            error={fieldState.error?.message}
          >
            <Input
              className={authInputClass}
              placeholder={t('onboarding.create.namePlaceholder')}
              aria-labelledby="organizationName"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!disabled}
              autoComplete="organization"
              textContentType="organizationName"
            />
          </FormField>
        )}
      />
      <Text className="-mt-2 text-xs text-ink-400">{t('onboarding.create.hint')}</Text>

      <Button
        className={authControlClass}
        disabled={disabled}
        onPress={handleSubmit((values) => onSubmit(values))}
      >
        <Text>{isPending ? t('onboarding.create.submitting') : t('onboarding.create.submit')}</Text>
      </Button>
    </View>
  );
}
