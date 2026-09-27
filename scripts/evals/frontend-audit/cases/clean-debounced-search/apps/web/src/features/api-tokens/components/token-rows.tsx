import type { ApiTokenEntity } from '@flama/frontend-consumer';
import { TokenStatusBadge } from '@/features/api-tokens/components/token-status-badge';

/** The tokens whose name contains `query`, one row each. */
export function TokenRows({ tokens, query }: { tokens: ApiTokenEntity[]; query: string }) {
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? tokens.filter((token) => token.name.toLowerCase().includes(needle))
    : tokens;

  return (
    <ul className="flex flex-col">
      {visible.map((token) => (
        <li key={token.id} className="flex items-center gap-2 py-1.5">
          <span className="min-w-0 flex-1 truncate text-ink-900">{token.name}</span>
          <span className="font-mono text-xs text-ink-400">{token.prefix}…</span>
          <TokenStatusBadge status={token.status} />
        </li>
      ))}
    </ul>
  );
}
