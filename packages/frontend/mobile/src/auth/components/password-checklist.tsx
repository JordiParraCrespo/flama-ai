import type { ReactNode } from 'react';
import { type Control, type FieldValues, type Path, useWatch } from 'react-hook-form';
import {
  checkPassword,
  meetsRequirements,
  PasswordRequirements,
  type PasswordRule,
} from './password-requirements';

/**
 * The live password checklist, subscribed at the leaf.
 *
 * It watches the password field (and the confirmation, when the screen has
 * one) itself, so every keystroke re-renders this checklist and whatever the
 * render prop returns — the submit button it gates — and not the whole form.
 *
 * Web keeps its copy of this in `apps/web`; on mobile both Expo apps ask for
 * it (register here, reset-password in the control plane too), so it lives in
 * the kit instead of being written twice.
 */
export function PasswordChecklist<TValues extends FieldValues>({
  control,
  name,
  confirmName,
  rules,
  className,
  children,
}: {
  control: Control<TValues>;
  name: Path<TValues>;
  /** The confirm field, on screens whose rules include `match`. */
  confirmName?: Path<TValues>;
  rules: readonly PasswordRule[];
  className?: string;
  /** Receives whether every rule is met; renders the control it gates. */
  children: (satisfied: boolean) => ReactNode;
}) {
  const watched = useWatch({
    control,
    name: (confirmName ? [name, confirmName] : [name]) as Path<TValues>[],
  }) as unknown as (string | undefined)[];

  const [password, confirmPassword] = watched;
  const results = confirmName
    ? checkPassword(password ?? '', confirmPassword ?? '')
    : checkPassword(password ?? '');

  return (
    <>
      <PasswordRequirements results={results} rules={rules} className={className} />
      {children(meetsRequirements(results, rules))}
    </>
  );
}
