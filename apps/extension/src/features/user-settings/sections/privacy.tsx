import { useTranslation } from 'react-i18next';
import { SettingsCard } from '@/features/user-settings/components/settings-card';

/**
 * What the extension can see, said plainly where a person decides whether to
 * trust it. Keep it true: it is the manifest's permission list in words, and
 * `manifest.spec.ts` fails when the list grows.
 */
export function Privacy() {
  const { t } = useTranslation();

  return (
    <SettingsCard
      title={t('extension.options.privacyTitle')}
      description={t('extension.options.privacyDescription')}
    >
      <p className="text-xs text-ink-400">
        {t('extension.options.version', { version: __APP_VERSION__ })}
      </p>
    </SettingsCard>
  );
}
