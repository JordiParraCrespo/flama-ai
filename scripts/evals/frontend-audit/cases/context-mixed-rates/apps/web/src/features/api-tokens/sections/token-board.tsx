import { useApiTokens } from '@flama/frontend-consumer/react';
import { useState } from 'react';
import { TokenCard } from '@/features/api-tokens/components/token-card';
import { type TokenDensity, TokenViewContext } from '@/features/api-tokens/hooks/use-token-view';

/**
 * Every token as a card. The card under the pointer is highlighted and its
 * neighbours dim, so the board needs to know which one that is.
 */
export function TokenBoard({ density }: { density: TokenDensity }) {
  const { data: tokens } = useApiTokens();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <TokenViewContext value={{ density, hoveredId, setHoveredId }}>
      <div className="grid grid-cols-3 gap-3">
        {(tokens ?? []).map((token) => (
          <TokenCard key={token.id} token={token} />
        ))}
      </div>
    </TokenViewContext>
  );
}
