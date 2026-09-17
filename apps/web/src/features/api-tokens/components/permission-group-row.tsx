import { Badge, ToggleGroup, ToggleGroupItem } from '@flama/design-system-web';
import {
  Building2,
  CreditCard,
  KeyRound,
  Mail,
  Shield,
  UserRound,
  Users,
  Workflow,
} from '@flama/design-system-web/icons';
import type { PermissionGroup, Scope } from '@flama/shared';
import { type Control, type FieldPath, type FieldValues, useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { Selection } from '@/features/api-tokens/lib/scope-selection';

const PERMISSION_ICONS: Record<PermissionGroup['resource'], typeof UserRound> = {
  profile: UserRound,
  users: Users,
  admin: Shield,
  roles: Shield,
  organizations: Building2,
  members: Users,
  invitations: Mail,
  workspaces: Workflow,
  tokens: KeyRound,
  billing: CreditCard,
  leads: Users,
};

/**
 * One resource's row of the permission picker, subscribed to its own field.
 *
 * This is where the leaf subscription pays: `useController` here means a click
 * on "Edit" for `tokens` re-renders the tokens row. While the picker held one
 * flat `Scope[]`, the same click re-rendered all eleven rows and their
 * thirty-three toggles.
 */
export function PermissionGroupRow<TFieldValues extends FieldValues>({
  group,
  grantable,
  control,
  name,
  disabled,
}: {
  group: PermissionGroup;
  grantable: readonly Scope[];
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  // No `defaultValue`: a row that has never been touched has granted nothing,
  // and `scopesFromSelection` reads a missing key as exactly that.
  const { field } = useController({ control, name });

  const selection = (field.value ?? 'none') as Selection;
  const allowed = new Set(grantable);
  const Icon = PERMISSION_ICONS[group.resource];

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-sunken text-ink-600">
        <Icon className="size-4" />
      </span>
      <div className="min-w-40 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{group.label}</span>
          {group.sensitive && <Badge variant="paused">{t('apiTokens.sensitive')}</Badge>}
        </div>
        <p className="text-sm text-ink-600">{group.description}</p>
        {selection !== 'none' && (
          <p className="mt-1 text-xs text-ink-600">{group.levels[selection].description}</p>
        )}
      </div>

      <ToggleGroup
        multiple={false}
        value={[selection]}
        onValueChange={(next) => next[0] && field.onChange(next[0] as Selection)}
        disabled={disabled}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem id={`${group.resource}-none`} value="none">
          {t('apiTokens.levels.none')}
        </ToggleGroupItem>
        <ToggleGroupItem
          id={`${group.resource}-read`}
          value="read"
          disabled={!allowed.has(group.levels.read.scope)}
        >
          {group.levels.read.label}
        </ToggleGroupItem>
        <ToggleGroupItem
          id={`${group.resource}-write`}
          value="write"
          disabled={!allowed.has(group.levels.write.scope)}
        >
          {group.levels.write.label}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
