import { Button, Field, FieldError, FieldGroup, Input } from '@flama/design-system-web';
import { CardFoot, FieldRow, SectionCard, useZodResolver } from '@flama/frontend-web';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { LogoPreview } from '@/features/organizations/components/logo-preview';
import { RemoveLogoButton } from '@/features/organizations/components/remove-logo-button';
import {
  type OrganizationFormDto,
  organizationFormSchema,
} from '@/features/organizations/lib/organization-form';

/**
 * The organization's name and mark. Nothing here watches a field: the preview
 * and the remove button subscribe to what they show, so a keystroke re-renders
 * them rather than the card.
 */
export function OrganizationForm({
  values,
  disabled,
  isPending,
  onChange,
  onSubmit,
}: {
  /** Re-seeds the form whenever the saved organization changes. */
  values: OrganizationFormDto;
  /** True while the organization is still loading, or there is none to edit. */
  disabled: boolean;
  isPending: boolean;
  /** Called on every user edit, so a stale failure can be cleared. */
  onChange: () => void;
  /** Resolves once the changes are saved; rejects when the request fails. */
  onSubmit: (values: OrganizationFormDto) => Promise<void>;
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<OrganizationFormDto>({
    resolver: useZodResolver(organizationFormSchema),
    values,
  });

  const submitting = isPending || isSubmitting;

  const submit = handleSubmit(async (next) => {
    try {
      await onSubmit(next);
    } catch {
      // The section shows the failure; the edits stay for another attempt.
      return;
    }
    reset(next);
  });

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup className="gap-0">
        <SectionCard>
          <FieldRow label={t('settings.general.name')} hint={t('settings.general.nameHint')}>
            <Field data-invalid={Boolean(errors.name)}>
              <Input
                {...register('name', { onChange })}
                id="organization-name"
                aria-label={t('settings.general.name')}
                aria-invalid={Boolean(errors.name)}
                disabled={submitting || disabled}
              />
              <FieldError errors={[errors.name]} />
            </Field>
          </FieldRow>

          <FieldRow label={t('settings.general.logo')} hint={t('settings.general.logoHint')}>
            <div className="flex items-start gap-4">
              <LogoPreview control={control} />
              <Field data-invalid={Boolean(errors.logo)} className="min-w-0 flex-1 gap-2">
                <Input
                  {...register('logo', { onChange })}
                  id="organization-logo"
                  type="url"
                  placeholder="https://…"
                  aria-label={t('settings.general.logoUrl')}
                  aria-invalid={Boolean(errors.logo)}
                  disabled={submitting || disabled}
                />
                <FieldError errors={[errors.logo]} />
                <RemoveLogoButton
                  control={control}
                  disabled={submitting}
                  onClick={() => {
                    onChange();
                    setValue('logo', '', { shouldDirty: true, shouldValidate: true });
                  }}
                />
              </Field>
            </div>
          </FieldRow>

          <CardFoot>
            <Button type="submit" size="lg" disabled={submitting || !isDirty}>
              {t('settings.general.save')}
            </Button>
          </CardFoot>
        </SectionCard>
      </FieldGroup>
    </form>
  );
}
