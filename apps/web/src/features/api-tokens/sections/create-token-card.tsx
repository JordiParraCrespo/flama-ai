import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@flama/design-system-web';
import { useCreateApiToken, useOrganizations } from '@flama/frontend-consumer/react';
import { useErrorMessage } from '@flama/frontend-web';
import type { PermissionGroup, Scope } from '@flama/shared';
import { useTranslation } from 'react-i18next';
import { CreateTokenForm } from '@/features/api-tokens/forms/create-token-form';

export function CreateTokenCard({
  groups,
  grantable,
  loadingCatalog,
  onCreated,
}: {
  groups: readonly PermissionGroup[];
  grantable: Scope[];
  loadingCatalog: boolean;
  onCreated: (secret: string) => void;
}) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
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
          groups={groups}
          grantable={grantable}
          loadingCatalog={loadingCatalog}
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
