/** The profile screen's panes, in the sub-nav's order. */
export const PROFILE_PANES = ['details', 'password', 'sessions', 'preferences'] as const;

export type ProfilePane = (typeof PROFILE_PANES)[number];

/**
 * The profile route's search: `section` when it names a pane, and every other
 * key carried through untouched. What `validateSearch` returns *becomes* the
 * search, so narrowing it to `section` would delete whatever else is there on
 * the next navigation.
 */
export function parseProfileSearch(
  search: Record<string, unknown>,
): Record<string, unknown> & { section?: ProfilePane } {
  const { section: requested, ...rest } = search;
  return PROFILE_PANES.includes(requested as ProfilePane)
    ? { ...rest, section: requested as ProfilePane }
    : rest;
}
