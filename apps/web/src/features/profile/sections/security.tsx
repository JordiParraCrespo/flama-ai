import { GroupHeading, SectionHead } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { SessionList } from '@/features/profile/sections/session-list';

/**
 * The workspace settings' Security pane: the reader's own sessions, the same
 * list the profile's Sessions pane draws. Workspace-wide policy (password
 * floors, session lengths, approved domains) is not a thing this deployment
 * stores yet, so the pane says nothing about it rather than showing controls
 * that do nothing.
 */
export function SecuritySection() {
  const { t } = useTranslation();

  return (
    <>
      <SectionHead title={t('settings.security.title')} sub={t('settings.security.description')} />
      <GroupHeading>{t('settings.security.sessions')}</GroupHeading>
      <SessionList />
    </>
  );
}
