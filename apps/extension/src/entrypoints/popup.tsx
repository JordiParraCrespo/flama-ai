import { useAuthState } from '@flama/frontend-core/react';
import { useTranslation } from 'react-i18next';
import { SignInScreen } from '@/features/auth/screens/sign-in';
import { SessionGate } from '@/features/auth/sections/session-gate';
import { CurrentPage } from '@/features/clips/sections/current-page';
import { PageHeader } from '@/features/profile/sections/page-header';
import { mount } from '@/providers/mount';

/**
 * The toolbar popup: the page you are on, and saving it. Opened by the toolbar
 * button or Alt+Shift+F, closed the moment it loses focus — so it does one
 * thing, fast, and anything longer happens in the side panel.
 */
function Popup() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthState();

  return (
    <>
      <PageHeader title={t('common.appName')} signedIn={isAuthenticated} />
      <SessionGate
        signedOut={
          <div className="p-5">
            <SignInScreen />
          </div>
        }
      >
        <CurrentPage />
      </SessionGate>
    </>
  );
}

mount(<Popup />);
