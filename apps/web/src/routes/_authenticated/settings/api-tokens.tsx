import { createFileRoute } from '@tanstack/react-router';
import { ApiTokensScreen } from '@/features/api-tokens/screens/api-tokens';
// flama:begin organizations
import { TokenOrganizationsField } from '@/features/organizations/sections/token-organizations-field';
// flama:end organizations

export const Route = createFileRoute('/_authenticated/settings/api-tokens')({
  component: ApiTokensPage,
});

function ApiTokensPage() {
  return (
    <ApiTokensScreen>
      {/* flama:begin organizations */}
      <TokenOrganizationsField />
      {/* flama:end organizations */}
    </ApiTokensScreen>
  );
}
