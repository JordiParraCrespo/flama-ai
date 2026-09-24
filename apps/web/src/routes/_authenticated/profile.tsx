import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { type ProfilePane, parseProfileSearch } from '@/features/profile/lib/panes';
import { ProfileScreen } from '@/features/profile/screens/profile';

/**
 * The open pane lives in the URL, as on `/settings`: a pane can be linked to,
 * and the back button steps between panes instead of leaving the screen.
 */
export const Route = createFileRoute('/_authenticated/profile')({
  validateSearch: parseProfileSearch,
  component: ProfilePage,
});

function ProfilePage() {
  const { section = 'details' } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <ProfileScreen
      section={section}
      onSectionChange={(next: ProfilePane) => navigate({ search: { section: next } })}
    />
  );
}
