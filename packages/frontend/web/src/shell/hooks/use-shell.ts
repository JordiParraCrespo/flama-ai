import { createContext, useContext } from 'react';
import type { NavItem, NavLink, ShellWorkspace } from '../lib/nav';

/**
 * What an app hands the shell once, at its authenticated layout: its
 * navigation, the account menu's extra links and the workspace to name.
 * Everything under `AppShell` reads this rather than being passed it.
 */
export interface ShellConfig {
  nav: readonly NavItem[];
  /** Links shown in the account menu above the language list. */
  userMenuLinks?: readonly NavLink[];
  workspace?: ShellWorkspace;
}

const ShellContext = createContext<ShellConfig | null>(null);

export const ShellProvider = ShellContext.Provider;

export function useShell(): ShellConfig {
  const config = useContext(ShellContext);
  if (!config) throw new Error('useShell must be used within <AppShell>');
  return config;
}
