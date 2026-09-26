import { Alert, AlertDescription, Skeleton } from '@flama/design-system-web';
import { useUpdateUserSettings, useUserSettings } from '@flama/frontend-core/react';
import {
  SectionCard,
  SectionHead,
  useErrorMessage,
  useLocale,
  useTheme,
} from '@flama/frontend-web';
import {
  DEFAULT_USER_SETTINGS,
  LOCALES,
  type Locale,
  type UpdateUserSettingsDto,
} from '@flama/shared/schemas/profile';
import { useTranslation } from 'react-i18next';
import { PreferencesForm } from '@/features/profile/forms/preferences-form';

export function PreferencesSection() {
  const { t, i18n } = useTranslation();
  const resolveError = useErrorMessage();
  const settings = useUserSettings();
  const update = useUpdateUserSettings();
  const { theme, setTheme } = useTheme();
  const shown = useLocale();
  const locale = (LOCALES as readonly string[]).includes(shown)
    ? (shown as Locale)
    : DEFAULT_USER_SETTINGS.locale;

  /**
   * Theme and language are applied here, the moment they change, not once the
   * save lands: both are also chosen per device and persist locally, so the
   * server's copy is the cross-device default, not the truth about what this
   * browser shows. A failed save leaves the device's choice and says so above.
   */
  const onSubmit = (values: UpdateUserSettingsDto) => {
    if (values.theme !== theme && values.theme !== 'system') setTheme(values.theme);
    if (values.locale !== locale) void i18n.changeLanguage(values.locale);
    update.mutate(values);
  };

  const disabled = settings.isPending || update.isPending;
  const failure = settings.error ?? update.error;

  if (settings.isPending) {
    return (
      <>
        <SectionHead
          title={t('profile.preferences.title')}
          sub={t('profile.preferences.description')}
        />
        <SectionCard>
          <div className="flex flex-col gap-3 p-4.5">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <SectionHead
        title={t('profile.preferences.title')}
        sub={t('profile.preferences.description')}
      />

      {failure && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{resolveError(failure).message}</AlertDescription>
        </Alert>
      )}

      <PreferencesForm
        saved={settings.data}
        theme={theme}
        locale={locale}
        disabled={disabled}
        onSubmit={onSubmit}
      />
    </>
  );
}
