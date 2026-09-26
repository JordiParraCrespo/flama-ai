import { PageHead } from '@flama/frontend-web';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateTokenCard } from '@/features/api-tokens/sections/create-token-card';
import { TokenTable } from '@/features/api-tokens/sections/token-table';

/**
 * The workspace's API tokens: make one, then everything already made.
 *
 * The screen composes and nothing else. It used to hold both queries and hand
 * the results down — which meant a background refetch of the token list, or the
 * arrival of the permission catalog, re-rendered the create form and the table
 * alike. The two sections below share nothing, so they are two subscriptions.
 * `children` are create-form fields another feature adds; the route composes them.
 */
export function ApiTokensScreen({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();

  return (
    <>
      <PageHead title={t('apiTokens.title')} sub={t('apiTokens.description')} />

      <div className="flex flex-col gap-4">
        <CreateTokenCard>{children}</CreateTokenCard>
        <TokenTable />
      </div>
    </>
  );
}
