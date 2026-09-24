import { Badge, DropdownMenuItem } from '@flama/design-system-web';
import { Cpu } from '@flama/design-system-web/icons';
import type { ApiTokenEntity } from '@flama/frontend-consumer';
import { useApiTokens } from '@flama/frontend-consumer/react';
import {
  DataTable,
  type DataTableColumn,
  formatMediumDate,
  GroupHeading,
  paginateRows,
  useLocale,
  useTableQuery,
} from '@flama/frontend-web';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TokenStatusBadge } from '@/features/api-tokens/components/token-status-badge';
import { RevokeTokenDialog } from '@/features/api-tokens/dialogs/revoke-token';
import { TOKEN_PAGE_SIZE } from '@/features/api-tokens/lib/token-status';

/**
 * Every token the workspace has, with its own subscription.
 *
 * The list is asked for here, not handed down: this is the only thing that
 * renders it, and a refetch — after a create, after a revoke, on a window
 * refocus — has no business re-rendering the form above.
 */
export function TokenTable() {
  const { t } = useTranslation();
  const locale = useLocale();
  const tokens = useApiTokens();
  // Held here, not in the dialog: it opens from a row menu that unmounts on close.
  const [revoking, setRevoking] = useState<ApiTokenEntity | null>(null);

  // Only the page is in the URL here: the list is short, has no search and no
  // filter, and the one thing worth linking to is a row further down it.
  const query = useTableQuery({ prefix: 'tokens' });
  const page = paginateRows(tokens.data ?? [], TOKEN_PAGE_SIZE, query);

  const columns: DataTableColumn<ApiTokenEntity>[] = [
    {
      key: 'name',
      label: t('apiTokens.name'),
      width: 200,
      render: (token) => <span className="font-medium">{token.name}</span>,
    },
    {
      key: 'prefix',
      label: t('apiTokens.prefix'),
      width: 120,
      render: (token) => (
        // Only the prefix survives creation — the rest is stored as a digest,
        // so there is nothing else to show.
        <span className="font-mono text-xs tracking-wide text-ink-600">{token.prefix}…</span>
      ),
    },
    {
      key: 'permissions',
      label: t('apiTokens.permissions'),
      width: 320,
      render: (token) => (
        <span className="flex max-w-80 flex-wrap gap-1">
          {token.scopes.map((scope) => (
            <Badge key={scope} variant="neutral" className="font-mono text-xs">
              {scope}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('apiTokens.status'),
      width: 120,
      render: (token) => <TokenStatusBadge status={token.status} />,
    },
    {
      key: 'lastUsed',
      label: t('apiTokens.lastUsed'),
      width: 140,
      align: 'right',
      render: (token) => (
        <span className="text-ink-400">
          {token.lastUsedAt ? formatMediumDate(token.lastUsedAt, locale) : t('apiTokens.neverUsed')}
        </span>
      ),
    },
  ];

  return (
    <section>
      {/* The heading sits above the table rather than inside a card of its own:
          `DataTable` brings the card, and nesting one in another gave this list
          a header two rows taller than every other table. */}
      <GroupHeading description={t('apiTokens.yourTokensDescription')}>
        {t('apiTokens.yourTokens')}
      </GroupHeading>
      <DataTable
        columns={columns}
        rows={page.rows}
        pagination={page.pagination}
        getKey={(token) => token.id}
        isLoading={tokens.isLoading}
        // A revoked token cannot be un-revoked, and revoking a handful at once is
        // not something anyone asked for — so there is no selection here.
        selectable={false}
        emptyLabel={t('apiTokens.empty')}
        emptyIcon={<Cpu />}
        rowActions={(token) =>
          // A revoked or expired token has nothing left to do to it, and a menu
          // whose only item is disabled says less than no menu at all.
          token.isActive ? (
            <DropdownMenuItem variant="destructive" onClick={() => setRevoking(token)}>
              {t('apiTokens.revoke')}
            </DropdownMenuItem>
          ) : null
        }
      />
      {revoking && <RevokeTokenDialog token={revoking} onClose={() => setRevoking(null)} />}
    </section>
  );
}
