import type { PermissionGroup, Scope, ScopeAccessLevel } from '@flama/shared';

/**
 * What a permission group is set to. `none` means the group is not granted.
 *
 * Edit implies Read, so the three are mutually exclusive rather than a pair of
 * checkboxes — that keeps "what did I just grant" unambiguous.
 */
export type Selection = ScopeAccessLevel | 'none';

/**
 * The form's permission value: one selection per resource.
 *
 * It used to be the flat `Scope[]` the API takes, which made the whole picker
 * one controlled value — eleven groups and thirty-three toggles re-rendering
 * because one of them changed. Keyed by resource, each row is its own field and
 * a click costs one row. The flattening happens once, on submit.
 */
export type ScopeSelection = Record<string, Selection>;

/** What the API takes: the scope behind each group that is set to something. */
export function scopesFromSelection(
  groups: readonly PermissionGroup[],
  selection: ScopeSelection,
): Scope[] {
  return groups.flatMap((group) => {
    const level = selection[group.resource];
    return level && level !== 'none' ? [group.levels[level].scope] : [];
  });
}

/** Whether anything at all is granted. A token with no scopes can call nothing. */
export function hasAnyScope(selection: ScopeSelection): boolean {
  return Object.values(selection).some((level) => level !== 'none');
}
