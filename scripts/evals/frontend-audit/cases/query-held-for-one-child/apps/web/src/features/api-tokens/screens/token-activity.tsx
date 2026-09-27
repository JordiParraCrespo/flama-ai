import { useApiTokens } from '@flama/frontend-consumer/react';
import { PageHead } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { RecentlyUsedTokens } from '@/features/api-tokens/sections/recently-used-tokens';

/**
 * Which tokens have been used lately.
 *
 * The screen owns the page's frame, the heading, and mounts the one pane
 * below it.
 */
export function TokenActivityScreen({ limit }: { limit: number }) {
  const { t } = useTranslation();
  const { data: tokens } = useApiTokens();

  return (
    <>
      <PageHead title={t('apiTokens.title')} sub={t('apiTokens.lastUsed')} />
      <RecentlyUsedTokens limit={limit} tokens={tokens ?? []} />
    </>
  );
}
