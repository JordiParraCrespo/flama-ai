import { Card } from '@flama/design-system-web';
import { useState } from 'react';
import { useClampedPage } from '../hooks/use-clamped-page';
import type { DataTableProps } from '../lib/data-table-types';
import { DataTableBody } from './data-table-body';
import { DataTableFooter } from './data-table-footer';
import { DataTableHeader } from './data-table-header';

/** One frozen empty set, so an untouched selection has a stable identity. */
const NO_SELECTION: ReadonlySet<string> = new Set();

/**
 * The workspace's table block: a card whose header carries search, filters and
 * the page's primary action, and swaps to a selection toolbar the moment a row
 * is ticked. Mirrors `DataTableBlock` in `design/crm/shell.js`.
 *
 * Everything the server decides — the page, the ordering, the filter — is a
 * controlled prop, because the rows handed in are one page of a larger set. The
 * one piece of state it owns is the selection, which is a property of the
 * viewport and not of the query.
 *
 * Every list in `apps/web` is built from this — team, roles and API tokens
 * included, which each had their own card-plus-`Table` before, at their own
 * header height and with their own idea of what an empty one looks like.
 *
 * It is three components and a selection, rather than one component, because it
 * used to be one: 624 lines holding the search field, every row, every cell and
 * the pager, so a keystroke re-rendered all of them. The header, the body and
 * the footer now change on their own terms — see `DataTableSearch` for where a
 * keystroke stops.
 */
export function DataTable<TRow>({
  columns,
  rows,
  getKey,
  pagination,
  search,
  facets,
  actions,
  addAction,
  sort,
  rowActions,
  bulkActions,
  onRowClick,
  isLoading,
  isFetching,
  emptyLabel,
  emptyIcon,
  selectable = true,
}: DataTableProps<TRow>) {
  /**
   * The selection belongs to the rows on screen, and only to them.
   *
   * These rows are one page of a server-side query, so a key ticked under a
   * different page, search or filter is no longer something the reader can see
   * — and a bulk action carrying it would change a lead they were never shown.
   * Two things keep that from happening: the selection is stored together with
   * the query it was made under and reads as empty under any other, and what
   * the bulk callbacks receive is intersected with the current page regardless.
   *
   * Storing the identity beside the keys is what makes "drop it when the query
   * moves" a derivation rather than an effect: there is no moment where the
   * old selection renders against the new rows. The reset below then commits
   * the drop, so coming back to the same page later does not resurrect ticks
   * the reader stopped seeing when they left.
   *
   * `search.value` is the *settled* search, not what is under the cursor, so
   * this string is rebuilt once per search rather than once per character. That
   * matters more than it looks: a changed identity commits through the
   * render-phase `setSelection` below, so a four-letter word used to cost the
   * whole table four extra render passes on top of the four it already paid.
   */
  const queryIdentity = JSON.stringify([
    pagination.page,
    search?.value ?? null,
    facets?.map((facet) => facet.value) ?? null,
    sort ? [sort.key, sort.order] : null,
  ]);

  const [selection, setSelection] = useState<{
    identity: string;
    keys: ReadonlySet<string>;
  }>(() => ({ identity: queryIdentity, keys: NO_SELECTION }));
  if (selection.identity !== queryIdentity) {
    setSelection({ identity: queryIdentity, keys: NO_SELECTION });
  }
  const selected = selection.identity === queryIdentity ? selection.keys : NO_SELECTION;

  /** Applies `update` to the selection made under the current query. */
  const updateSelection = (update: (current: ReadonlySet<string>) => ReadonlySet<string>) =>
    setSelection((current) => ({
      identity: queryIdentity,
      keys: update(current.identity === queryIdentity ? current.keys : NO_SELECTION),
    }));

  const pageKeys = rows.map(getKey);
  const allSelected = pageKeys.length > 0 && pageKeys.every((key) => selected.has(key));
  const someSelected = !allSelected && pageKeys.some((key) => selected.has(key));

  const clearSelection = () => updateSelection(() => NO_SELECTION);

  const selectedOnPage = pageKeys.filter((key) => selected.has(key));

  function toggleAll() {
    updateSelection((current) => {
      const next = new Set(current);
      for (const key of pageKeys) {
        if (allSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  function toggleOne(key: string) {
    updateSelection((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const selectedCount = selectable ? selectedOnPage.length : 0;
  useClampedPage({
    page: pagination.page,
    lastPage: Math.max(1, pagination.totalPages),
    isLoading,
    onPageChange: pagination.onPageChange,
  });

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <DataTableHeader
        search={search}
        facets={facets}
        actions={actions}
        addAction={addAction}
        selectedCount={selectedCount}
        selectedOnPage={selectedOnPage}
        clearSelection={clearSelection}
        bulkActions={bulkActions}
      />

      <div className="px-1">
        <DataTableBody
          columns={columns}
          rows={rows}
          getKey={getKey}
          selected={selected}
          selectable={selectable}
          allSelected={allSelected}
          someSelected={someSelected}
          toggleAll={toggleAll}
          toggleOne={toggleOne}
          sort={sort}
          rowActions={rowActions}
          onRowClick={onRowClick}
          isLoading={isLoading}
          isFetching={isFetching}
          emptyLabel={emptyLabel}
          emptyIcon={emptyIcon}
        />
      </div>

      <DataTableFooter pagination={pagination} />
    </Card>
  );
}
