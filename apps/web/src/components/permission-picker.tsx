import { Badge, Label, RadioGroup, RadioGroupItem } from '@flama/design-system-web';
import type { PermissionGroup, Scope, ScopeAccessLevel } from '@flama/shared';
import { useTranslation } from 'react-i18next';

/** What a group is set to. `none` means the group is not granted at all. */
type Selection = ScopeAccessLevel | 'none';

export interface PermissionPickerProps {
  groups: readonly PermissionGroup[];
  /** Scopes the signed-in user may grant. Anything else is shown disabled. */
  grantable: readonly Scope[];
  value: readonly Scope[];
  onChange: (scopes: Scope[]) => void;
  disabled?: boolean;
}

/**
 * Per-resource permission picker: each group is granted None, Read or Edit.
 *
 * Edit implies Read, so the three options are mutually exclusive rather than a
 * pair of checkboxes — that keeps "what did I just grant" unambiguous. Levels
 * the user cannot grant themselves are disabled, mirroring the rule the API
 * enforces: a token never exceeds its creator.
 */
export function PermissionPicker({
  groups,
  grantable,
  value,
  onChange,
  disabled,
}: PermissionPickerProps) {
  const { t } = useTranslation();
  const granted = new Set(value);
  const allowed = new Set(grantable);

  function selectionFor(group: PermissionGroup): Selection {
    if (granted.has(group.levels.write.scope)) return 'write';
    if (granted.has(group.levels.read.scope)) return 'read';
    return 'none';
  }

  function handleChange(group: PermissionGroup, selection: Selection) {
    const next = value.filter(
      (scope) => scope !== group.levels.read.scope && scope !== group.levels.write.scope,
    );
    if (selection !== 'none') next.push(group.levels[selection].scope);
    onChange(next);
  }

  return (
    <div className="divide-y rounded-md border">
      {groups.map((group) => {
        const selection = selectionFor(group);
        const canRead = allowed.has(group.levels.read.scope);
        const canWrite = allowed.has(group.levels.write.scope);

        return (
          <div
            key={group.resource}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{group.label}</span>
                {group.sensitive && (
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-500">
                    {t('apiTokens.sensitive')}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{group.description}</p>
              {selection !== 'none' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.levels[selection].description}
                </p>
              )}
            </div>

            <RadioGroup
              className="flex shrink-0 gap-4"
              value={selection}
              onValueChange={(next) => handleChange(group, next as Selection)}
              disabled={disabled}
            >
              <PermissionOption
                group={group.resource}
                value="none"
                label={t('apiTokens.levels.none')}
              />
              <PermissionOption
                group={group.resource}
                value="read"
                label={group.levels.read.label}
                disabled={!canRead}
              />
              <PermissionOption
                group={group.resource}
                value="write"
                label={group.levels.write.label}
                disabled={!canWrite}
              />
            </RadioGroup>
          </div>
        );
      })}
    </div>
  );
}

function PermissionOption({
  group,
  value,
  label,
  disabled,
}: {
  group: string;
  value: Selection;
  label: string;
  disabled?: boolean;
}) {
  const id = `${group}-${value}`;

  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} disabled={disabled} />
      <Label
        htmlFor={id}
        className={disabled ? 'text-muted-foreground/50' : 'cursor-pointer text-sm'}
      >
        {label}
      </Label>
    </div>
  );
}
