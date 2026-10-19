import { Button } from '@flama/design-system-web';
import { useMyProfile } from '@flama/frontend-consumer/react';
import { useLogout } from '@flama/frontend-core/react';
import { useTranslation } from 'react-i18next';
import { Person } from '@/features/profile/components/person';
import { broadcast } from '@/runtime/messaging';

/** The options page's account row: who is signed in, and signing out. */
export function AccountCard() {
  const { t } = useTranslation();
  const { data: user } = useMyProfile();
  const logout = useLogout();

  return (
    <div className="flex items-center justify-between gap-4">
      {user ? <Person user={user} /> : <div className="h-9" />}
      <Button
        variant="secondary"
        size="sm"
        disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, { onSuccess: () => void broadcast('session/changed') })
        }
      >
        {t('extension.nav.signOut')}
      </Button>
    </div>
  );
}
