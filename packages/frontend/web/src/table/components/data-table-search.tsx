import { SearchInput } from '@flama/design-system-web';
import { useState } from 'react';
import { useDebouncedCallback } from '../hooks/use-debounced-callback';
import {
  type DataTableSearch as DataTableSearchProps,
  TABLE_HEADER_CONTROL_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
} from '../lib/data-table-types';

/**
 * The table's search field, and the only thing a keystroke re-renders.
 *
 * What the reader is typing is this component's state. It leaves only once
 * typing settles, which is what makes the difference measurable: while the live
 * value was a prop of `DataTable`, every character re-rendered the header, all
 * eight rows, every cell, every row menu and the pager — for a query that was
 * debounced anyway and had not been asked yet.
 *
 * The settled value still comes back down as `value`, because the URL is where
 * it lives: a followed link, a cleared filter or a back button changes it
 * without anyone typing, and the field has to follow.
 */
export function DataTableSearch({ value, onChange, placeholder }: DataTableSearchProps) {
  const [live, setLive] = useState(value);

  // Adjusting state to a prop, the way React documents it rather than with an
  // effect: when the settled value changes from outside — a cleared facet, a
  // followed link — the field takes it. A commit of what was just typed lands
  // here too and writes the same string, which is a no-op.
  const [settled, setSettled] = useState(value);
  if (settled !== value) {
    setSettled(value);
    setLive(value);
  }

  const commit = useDebouncedCallback(onChange, TABLE_SEARCH_DEBOUNCE_MS);

  return (
    <SearchInput
      containerClassName="w-70"
      size={TABLE_HEADER_CONTROL_SIZE}
      hint={null}
      placeholder={placeholder}
      value={live}
      onChange={(event) => {
        setLive(event.target.value);
        commit(event.target.value);
      }}
    />
  );
}
