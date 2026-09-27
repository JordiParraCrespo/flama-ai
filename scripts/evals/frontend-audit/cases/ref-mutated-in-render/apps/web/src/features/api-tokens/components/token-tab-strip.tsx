import type { ApiTokenEntity } from '@flama/frontend-consumer';
import { useRef } from 'react';
import { TokenStatusBadge } from '@/features/api-tokens/components/token-status-badge';

/**
 * The tokens as tabs across the top of the usage pane. A token that has been
 * used at least once while the pane was open keeps its badge, so a refetch
 * that briefly drops `lastUsedAt` does not flicker the whole strip.
 */
export function TokenTabStrip({
  tokens,
  activeId,
  onSelect,
}: {
  tokens: ApiTokenEntity[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const seenUsed = useRef(new Set<string>());
  for (const token of tokens) {
    if (token.lastUsedAt) seenUsed.current.add(token.id);
  }

  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto">
      {tokens.map((token) => (
        <button
          key={token.id}
          type="button"
          role="tab"
          aria-selected={token.id === activeId}
          onClick={() => onSelect(token.id)}
          className="flex items-center gap-1.5 px-2 py-1 text-ink-900"
        >
          {token.name}
          {seenUsed.current.has(token.id) && <TokenStatusBadge status={token.status} />}
        </button>
      ))}
    </div>
  );
}
