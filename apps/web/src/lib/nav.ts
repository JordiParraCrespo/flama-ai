import { LayoutDashboard, Settings, UserRound } from '@flama/design-system-web/icons';
import type { NavItem, NavLink } from '@flama/frontend-web';

/**
 * The workspace's destinations, in the order the sidebar lists them: Dashboard
 * first, then the working surfaces, with Settings held back at the bottom. One
 * model, read by both the sidebar and the command palette, so a page can never
 * appear in one and not the other.
 *
 * A row's `policies` come from `SCREENS` in `@flama/frontend-web`, never
 * written out here, so a row cannot claim less than the endpoint behind it
 * enforces. Empty means always visible: the dashboard reads only the caller's
 * own profile, and every user manages their own API tokens under Settings.
 */
export const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard', policies: [] },
  { to: '/settings', icon: Settings, labelKey: 'settings', policies: [] },
] as const satisfies readonly NavItem[];

/** The account menu's own destinations, above the language list. */
export const USER_MENU_LINKS = [
  { to: '/profile', icon: UserRound, labelKey: 'viewProfile' },
  { to: '/settings', icon: Settings, labelKey: 'settings' },
] as const satisfies readonly NavLink[];
