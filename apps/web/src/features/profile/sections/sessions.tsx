import { SectionHead } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { SessionList } from '@/features/profile/sections/session-list';

/** The profile's Sessions pane. */
export function SessionsSection() {
  const { t } = useTranslation();

  return (
    <>
      <SectionHead title={t('profile.sessions.title')} sub={t('profile.sessions.description')} />
      <SessionList />
    </>
  );
}
