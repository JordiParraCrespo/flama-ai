import { AuthLayout, redirectSignedIn } from '@flama/frontend-web';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }) => redirectSignedIn({ context, location, landing: '/users' }),
  component: ControlPlaneAuthLayout,
});

/** The control plane's auth split: its own label and copy, no public-page links. */
function ControlPlaneAuthLayout() {
  return (
    <AuthLayout brandLabel="Flama Control" copy="control">
      <Outlet />
    </AuthLayout>
  );
}
