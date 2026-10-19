import { Button, Kbd } from '@flama/design-system-web';
import { Trans, useTranslation } from 'react-i18next';
import { SettingsCard } from '@/features/user-settings/components/settings-card';
import { useShortcuts } from '@/features/user-settings/hooks/use-shortcuts';
import { LINKS } from '@/lib/nav';

/** The two keyboard shortcuts as Chrome has them bound, and where to change them. */
export function Shortcuts() {
  const { t } = useTranslation();
  const { open, save } = useShortcuts();

  return (
    <SettingsCard
      title={t('extension.options.shortcutsTitle')}
      description={
        <Trans
          i18nKey="extension.options.shortcutsDescription"
          values={{ open: open || '—', save: save || '—' }}
          components={{ kbd: <Kbd /> }}
        />
      }
    >
      <Button variant="secondary" size="sm" onClick={() => void LINKS.shortcuts()}>
        {t('extension.options.manageShortcuts')}
      </Button>
    </SettingsCard>
  );
}
