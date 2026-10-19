import { LanguageSwitcher, ThemeToggle } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from '@/features/user-settings/components/settings-card';

/**
 * Theme and language for this browser. Both are stored in the extension
 * origin's `localStorage`, which every extension page shares, so the popup
 * and the side panel open in what was picked here.
 */
export function Appearance() {
  const { t } = useTranslation();

  return (
    <SettingsCard title={t('extension.options.appearanceTitle')}>
      <dl className="divide-y divide-border-subtle">
        <div className="flex items-center justify-between pb-3">
          <dt className="text-sm text-ink-900">{t('extension.options.theme')}</dt>
          <dd>
            <ThemeToggle />
          </dd>
        </div>
        <div className="flex items-center justify-between pt-3">
          <dt className="text-sm text-ink-900">{t('extension.options.language')}</dt>
          <dd>
            <LanguageSwitcher />
          </dd>
        </div>
      </dl>
    </SettingsCard>
  );
}
