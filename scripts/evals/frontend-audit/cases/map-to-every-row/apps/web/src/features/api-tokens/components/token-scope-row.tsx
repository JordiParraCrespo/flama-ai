import { Badge } from '@flama/design-system-web';
import type { ApiTokenEntity } from '@flama/frontend-consumer';
import type { PermissionGroup } from '@flama/shared';

/**
 * One token and the permission groups its scopes fall in, so a reader sees
 * "Users, Billing" rather than a list of raw scope strings.
 */
export function TokenScopeRow({
  token,
  groupsByScope,
}: {
  token: ApiTokenEntity;
  groupsByScope: Map<string, PermissionGroup>;
}) {
  const groups = [...new Set(token.scopes.map((scope) => groupsByScope.get(scope)?.label))];

  return (
    <li className="flex items-center gap-2 py-1.5">
      <span className="min-w-0 flex-1 truncate text-ink-900">{token.name}</span>
      {groups.map((group) =>
        group ? (
          <Badge key={group} variant="neutral">
            {group}
          </Badge>
        ) : null,
      )}
    </li>
  );
}
