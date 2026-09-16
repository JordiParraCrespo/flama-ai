import { AuthLayout, redirectSignedIn } from '@flama/frontend-web';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }) =>
    redirectSignedIn({
      context,
      location,
      landing: '/dashboard',
      // A signed-in invitee still has to redeem the invitation. Keep this one
      // auth-layout route reachable so an existing user can sign in and return
      // to the same link instead of being bounced to the dashboard first.
      allow: ['/accept-invitation'],
    }),
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
