import { useApiTokens, usePermissionCatalog } from '@flama/frontend-consumer/react';
import { TokenScopeRow } from '@/features/api-tokens/components/token-scope-row';

/** Every token, each labelled with the permission groups it can reach. */
export function TokenScopes() {
  const { data: tokens } = useApiTokens();
  const { data: catalog } = usePermissionCatalog();
  const groupsByScope = new Map(
    (catalog?.groups ?? []).flatMap((group) =>
      Object.values(group.levels).map((level) => [level.scope, group] as const),
    ),
  );

  return (
    <ul className="flex flex-col">
      {(tokens ?? []).map((token) => (
        <TokenScopeRow key={token.id} token={token} groupsByScope={groupsByScope} />
      ))}
    </ul>
  );
}
