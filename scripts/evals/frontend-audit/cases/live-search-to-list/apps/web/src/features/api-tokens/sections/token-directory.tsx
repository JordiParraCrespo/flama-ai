import { SearchInput, Skeleton } from '@flama/design-system-web';
import { useApiTokens } from '@flama/frontend-consumer/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TokenRows } from '@/features/api-tokens/components/token-rows';

/**
 * Every token the reader has made, with a search over their names.
 *
 * The list is short enough to filter in the browser, so the search narrows
 * what is already loaded rather than asking the API again.
 */
export function TokenDirectory() {
  const { t } = useTranslation();
  const { data: tokens, isPending } = useApiTokens();
  const [query, setQuery] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('common.search')}
      />
      {isPending ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <TokenRows tokens={tokens ?? []} query={query} />
      )}
    </div>
  );
}
