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
import { useFeatureFlag } from '@flama/frontend-core/react';
import { useErrorMessage } from '@flama/frontend-web';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SecretPanel } from '@/features/api-tokens/components/secret-panel';
import { CreateTokenForm } from '@/features/api-tokens/forms/create-token-form';

/**
 * Making a token: the queries it needs, the form, and the one look anybody gets
 * at the secret.
 *
 * The permission catalog is asked for here rather than on the screen: this is
 * the only thing that renders it, and while the screen held it, its arrival —
 * and every refetch of anything else the screen watched — went through the form
 * and the permission picker below it.
 *
 * The secret is this pane's own state for the same reason: this card is the
 * only thing that produces one and the panel above the form is the only thing
 * that shows it. It sat on the screen once, where dismissing it re-rendered the
 * token table underneath, which has nothing to do with it.
 *
 * `api_token_creation` is the kill switch the API enforces on the same
 * endpoint (`@RequireFlag`). Reading it here only spares the reader a form
 * that could only be refused; the tokens they already have keep working.
 */
export function CreateTokenCard() {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const catalog = usePermissionCatalog();
  const organizations = useOrganizations();
  const create = useCreateApiToken();
  const [secret, setSecret] = useState<string | null>(null);
  const creationEnabled = useFeatureFlag('api_token_creation');

  return (
    <>
      {secret && <SecretPanel secret={secret} onDismiss={() => setSecret(null)} />}

      <Card>
        <CardHeader>
          <CardTitle>{t('apiTokens.create')}</CardTitle>
          <CardDescription>
            {creationEnabled ? t('apiTokens.createDescription') : t('apiTokens.creationPaused')}
          </CardDescription>
        </CardHeader>
        {creationEnabled && (
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
                setSecret(secret);
              }}
            />
          </CardContent>
        )}
      </Card>
    </>
  );
}
