import { cn } from '@flama/design-system-web';
import type { PermissionGroup, Scope } from '@flama/shared';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { PermissionGroupRow } from '@/features/api-tokens/components/permission-group-row';

export interface PermissionPickerProps<TFieldValues extends FieldValues> {
  groups: readonly PermissionGroup[];
  /** Scopes the signed-in user may grant. Anything else is shown disabled. */
  grantable: readonly Scope[];
  /**
   * The form this picker writes into. Each row takes its own field off it, so a
   * click re-renders the row it happened in and nothing else — the rule is
   * "subscribe at the leaf", and eleven groups is where it starts to show.
   */
  control: Control<TFieldValues>;
  /** The field holding the `ScopeSelection`, e.g. `permissions`. */
  name: FieldPath<TFieldValues>;
  disabled?: boolean;
  className?: string;
}

/**
 * Per-resource permission picker: each group is granted None, Read or Edit.
 *
 * Levels the user cannot grant themselves are disabled, mirroring the rule the
 * API enforces: a token never exceeds its creator.
 */
export function PermissionPicker<TFieldValues extends FieldValues>({
  groups,
  grantable,
  control,
  name,
  disabled,
  className,
}: PermissionPickerProps<TFieldValues>) {
  return (
    <div
      className={cn(
        'divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle',
        className,
      )}
    >
      {groups.map((group) => (
        <PermissionGroupRow
          key={group.resource}
          group={group}
          grantable={grantable}
          control={control}
          name={`${name}.${group.resource}` as FieldPath<TFieldValues>}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
