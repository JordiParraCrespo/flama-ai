import { AuthLayout } from '@flama/frontend-web';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

/**
 * Everything a reader sees before the console: the sign-in screens under
 * `_public`, the invitation they were sent, and the workspace step a new
 * account lands on. One layout, so the wordmark, the column and the art panel
 * do not drift apart across the walk in.
 *
 * This route is chrome, not a gate. Its children want three different answers
 * to "who may be here" — signed-out only, signed-in only, and either — so each
 * carries its own `beforeLoad` and this one carries none.
 *
 * That is what makes the hand-off with `_authenticated` work, and it is easy
 * to break from here: `_authenticated` sends an account with no workspace to
 * `/onboarding`, which lives under this layout and is for signed-in readers.
 * A `redirectSignedIn` on *this* route would bounce them straight back out and
 * close that path.
 */
export const Route = createFileRoute('/_auth')({
  component: ConsumerAuthLayout,
});

function ConsumerAuthLayout() {
  const { t } = useTranslation();

  return (
    <AuthLayout
      links={[
        { to: '/privacy', label: t('public.navigation.privacy') },
        { to: '/terms', label: t('public.navigation.terms') },
      ]}
    >
      <Outlet />
    </AuthLayout>
  );
}
