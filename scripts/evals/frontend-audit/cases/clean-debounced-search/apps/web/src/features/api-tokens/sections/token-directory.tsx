import { Skeleton } from '@flama/design-system-web';
import { useApiTokens } from '@flama/frontend-consumer/react';
import { useState } from 'react';
import { TokenRows } from '@/features/api-tokens/components/token-rows';
import { TokenSearch } from '@/features/api-tokens/components/token-search';

/**
 * Every token the reader has made, with a search over their names. The list
 * is short enough to filter in the browser; what reaches it is the settled
 * query, never the half-typed one.
 */
export function TokenDirectory() {
  const { data: tokens, isPending } = useApiTokens();
  const [query, setQuery] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <TokenSearch value={query} onChange={setQuery} />
      {isPending ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <TokenRows tokens={tokens ?? []} query={query} />
      )}
    </div>
  );
}
