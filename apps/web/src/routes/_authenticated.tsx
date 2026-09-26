import { AppShell, redirectSignedOut, type ShellWorkspace } from '@flama/frontend-web';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ComponentType, ReactNode } from 'react';
// flama:begin organizations
import { WorkspaceGate } from '@/features/organizations/sections/workspace-gate';
// flama:end organizations
// flama:plugins shell-imports
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
 * The gates the shell opens through, outermost first. With organizations,
 * one decides whether the caller has somewhere to work, and which workspace
 * the shell names; with none, the shell opens straight away.
 */
const GATES: ShellGate[] = [
  // flama:begin organizations
  WorkspaceGate,
  // flama:end organizations
  // flama:plugins shell-gates
];

function AuthenticatedShell() {
  const shell = (workspace?: ShellWorkspace) => (
    <AppShell nav={NAV} userMenuLinks={USER_MENU_LINKS} workspace={workspace}>
      <Outlet />
    </AppShell>
  );
  const [Gate] = GATES;
  return Gate ? <Gate>{shell}</Gate> : shell();
}
