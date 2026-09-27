import { useApiTokens } from '@flama/frontend-consumer/react';
import { LastUsed } from '@/features/api-tokens/components/last-used';

/** Every token with how long ago it was last used. */
export function TokenUsage() {
  const { data: tokens } = useApiTokens();

  return (
    <ul className="flex flex-col">
      {(tokens ?? []).map((token) => (
        <li key={token.id} className="flex items-center justify-between gap-2 py-1.5">
          <span className="min-w-0 flex-1 truncate text-ink-900">{token.name}</span>
          <LastUsed at={token.lastUsedAt} />
        </li>
      ))}
    </ul>
  );
}
