import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-web';
import {
  useCreateApiToken,
  useOrganizations,
  usePermissionCatalog,
} from '@flama/frontend-consumer/react';
import { useErrorMessage } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { CreateTokenForm } from '@/features/api-tokens/forms/create-token-form';

/**
 * The create card, and every query it needs.
 *
 * The permission catalog is asked for here rather than on the screen: this is
 * the only thing that renders it, and while the screen held it, its arrival —
 * and every refetch of anything else the screen watched — went through the form
 * and the permission picker below it.
 */
export function CreateTokenCard({ onCreated }: { onCreated: (secret: string) => void }) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const catalog = usePermissionCatalog();
  const organizations = useOrganizations();
  const create = useCreateApiToken();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('apiTokens.create')}</CardTitle>
        <CardDescription>{t('apiTokens.createDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <CreateTokenForm
          groups={catalog.data?.groups ?? []}
          grantable={catalog.data?.grantable ?? []}
          loadingCatalog={catalog.isLoading}
          organizations={organizations.data ?? []}
          isPending={create.isPending}
          error={create.error ? resolveError(create.error).message : undefined}
          onSubmit={async ({ name, scopes, expiresInDays, organizationIds }) => {
            const { secret } = await create.mutateAsync({
              name,
              scopes,
              expiresInDays,
              organizationIds: organizationIds.length > 0 ? organizationIds : undefined,
            });
            onCreated(secret);
          }}
        />
      </CardContent>
    </Card>
  );
}
