import { Card, CardContent, CardTitle } from '@flama/design-system-web';
import type { ApiTokenEntity } from '@flama/frontend-consumer';
import { TokenStatusBadge } from '@/features/api-tokens/components/token-status-badge';
import { useTokenView } from '@/features/api-tokens/hooks/use-token-view';

/** One token: its name, its prefix and whether it still works. */
export function TokenCard({ token }: { token: ApiTokenEntity }) {
  const { density, hoveredId, setHoveredId } = useTokenView();
  const dimmed = hoveredId !== null && hoveredId !== token.id;

  return (
    <Card
      size={density === 'compact' ? 'sm' : 'default'}
      data-dimmed={dimmed || undefined}
      onPointerEnter={() => setHoveredId(token.id)}
      onPointerLeave={() => setHoveredId(null)}
    >
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{token.name}</CardTitle>
          <TokenStatusBadge status={token.status} />
        </div>
      </CardContent>
    </Card>
  );
}
