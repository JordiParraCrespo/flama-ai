import type { PermissionGroup, Scope } from '@flama/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScopeSelection } from '@/features/api-tokens/lib/scope-selection';

/**
 * The permission picker's render budget.
 *
 * The catalog has eleven groups and each offers three levels, so the picker is
 * thirty-three toggles. It used to hold one flat `Scope[]` for all of them,
 * which made every click a re-render of the whole thing; each row takes its own
 * field off the form now, so a click costs the three toggles of one row.
 *
 * Run under the app's own vitest config, which does not enable the React
 * Compiler — deliberately. The compiler brought the old shape down to zero on
 * its own, which is exactly why nobody noticed. What is asserted here is the
 * structure underneath it.
 */

const toggles = { rendered: 0 };

vi.mock('@flama/design-system-web', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  return {
    ...actual,
    // Stands in for the real toggle group only to give each option a plain
    // button to click and a place to count from. Everything else — the row, the
    // picker, React Hook Form — is the real thing.
    ToggleGroup: ({
      children,
      onValueChange,
    }: {
      children?: ReactNode;
      onValueChange?: (value: string[]) => void;
    }) => (
      <div>
        {children}
        {['none', 'read', 'write'].map((level) => (
          <button
            key={level}
            type="button"
            data-pick={level}
            onClick={() => onValueChange?.([level])}
          />
        ))}
      </div>
    ),
    ToggleGroupItem: ({ value, children }: { value: string; children?: ReactNode }) => {
      toggles.rendered += 1;
      return (
        <button type="button" data-level={value}>
          {children}
        </button>
      );
    },
  };
});

const RESOURCES = [
  'profile',
  'users',
  'admin',
  'roles',
  'organizations',
  'members',
  'invitations',
  'workspaces',
  'tokens',
  'billing',
  'leads',
] as const;

const GROUPS = RESOURCES.map((resource, index) => ({
  resource,
  label: `Group ${index}`,
  description: 'What this group covers.',
  sensitive: false,
  levels: {
    read: { scope: `${resource}:read`, label: 'Read', description: 'Read it.' },
    write: { scope: `${resource}:write`, label: 'Edit', description: 'Change it.' },
  },
})) as unknown as PermissionGroup[];

const GRANTABLE = GROUPS.flatMap((group) => [
  group.levels.read.scope,
  group.levels.write.scope,
]) as Scope[];

const TOGGLES_PER_ROW = 3;

function Harness() {
  const { control } = useForm<{ permissions: ScopeSelection }>({
    defaultValues: { permissions: {} },
  });

  return (
    <PermissionPicker groups={GROUPS} grantable={GRANTABLE} control={control} name="permissions" />
  );
}

// Imported after the mock is declared, so the picker resolves the stub above.
const { PermissionPicker } = await import('@/features/api-tokens/components/permission-picker');

afterEach(() => {
  cleanup();
  toggles.rendered = 0;
});

describe('PermissionPicker render budget', () => {
  it('grants one group without redrawing the other ten', () => {
    render(<Harness />);
    // Mounting draws every toggle; `useController` registering each row's field
    // draws them a second time. What matters is what a *click* costs after
    // that.
    expect(toggles.rendered).toBeGreaterThanOrEqual(GROUPS.length * TOGGLES_PER_ROW);

    toggles.rendered = 0;
    fireEvent.click(screen.getAllByRole('button').filter((b) => b.dataset.pick === 'write')[0]);

    expect(toggles.rendered).toBe(TOGGLES_PER_ROW);
  });

  it('keeps each group on its own field', () => {
    render(<Harness />);

    const write = screen.getAllByRole('button').filter((b) => b.dataset.pick === 'write');
    const read = screen.getAllByRole('button').filter((b) => b.dataset.pick === 'read');
    fireEvent.click(write[0]);
    fireEvent.click(read[1]);

    // Each row shows what its own level means, and only its own.
    expect(screen.getAllByText('Change it.')).toHaveLength(1);
    expect(screen.getAllByText('Read it.')).toHaveLength(1);
  });
});
