import { AppShell, redirectSignedOut, type ShellWorkspace } from '@flama/frontend-web';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ComponentType, ReactNode } from 'react';
// flama:begin organizations
import { WorkspaceGate } from '@/features/organizations/sections/workspace-gate';
// flama:end organizations
import { NAV, USER_MENU_LINKS } from '@/lib/nav';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => redirectSignedOut({ context, location }),
  component: AuthenticatedShell,
});

/** Stands between a signed-in reader and the shell, and names its workspace. */
type ShellGate = ComponentType<{
  children: (workspace: ShellWorkspace | undefined) => ReactNode;
}>;

/**
 * The gates the shell opens through, outermost first. Each may hold the shell
 * back (with organizations, until the caller has somewhere to work) and may
 * name the workspace it shows; with none, the shell opens straight away.
 */
const GATES: ShellGate[] = [
  // flama:begin organizations
  WorkspaceGate,
  // flama:end organizations
];

function AuthenticatedShell() {
  const shell = (workspace?: ShellWorkspace) => (
    <AppShell nav={NAV} userMenuLinks={USER_MENU_LINKS} workspace={workspace}>
      <Outlet />
    </AppShell>
  );
  const open = GATES.reduceRight<(workspace?: ShellWorkspace) => ReactNode>(
    (inner, Gate) => (outer) => <Gate>{(named) => inner(named ?? outer)}</Gate>,
    shell,
  );
  return open();
}
