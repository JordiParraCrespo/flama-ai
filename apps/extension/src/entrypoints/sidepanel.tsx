import { useAuthState } from '@flama/frontend-core/react';
import { useTranslation } from 'react-i18next';
import { SignInScreen } from '@/features/auth/screens/sign-in';
import { SessionGate } from '@/features/auth/sections/session-gate';
import { ClipsScreen } from '@/features/clips/screens/clips';
import { PageHeader } from '@/features/profile/sections/page-header';
import { mount } from '@/providers/mount';

/**
 * The side panel: the extension's room to work in, open beside any tab for as
 * long as the person wants it. It holds the saved pages; a feature that needs
 * more than a glance goes here, not in the popup.
 */
function SidePanel() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthState();

  return (
    <div className="flex min-h-svh flex-col">
      <PageHeader title={t('common.appName')} signedIn={isAuthenticated} />
      <SessionGate
        signedOut={
          <div className="p-6">
            <SignInScreen />
          </div>
        }
      >
        <ClipsScreen />
      </SessionGate>
    </div>
  );
}

mount(<SidePanel />);
