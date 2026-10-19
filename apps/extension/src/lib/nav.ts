import { ExternalLink, PanelRight, Settings } from '@flama/design-system-web/icons';
import { openOptions, openSidePanel, openUrl, SHORTCUTS_URL } from '@/runtime/tabs';
import { webAppUrl } from './auth-client';

/**
 * Where the extension can send someone, in one list. The account menu draws
 * `MENU`; the screens that link out (sign-up, a forgotten password, the
 * shortcut settings) take the rest from `LINKS`.
 *
 * Each destination is a function, not a URL: an extension cannot navigate an
 * `<a>` to its side panel or to chrome://, so "going" somewhere is a call.
 */
export const LINKS = {
  workspace: () => openUrl(`${webAppUrl}/dashboard`),
  register: () => openUrl(`${webAppUrl}/register`),
  forgotPassword: () => openUrl(`${webAppUrl}/forgot-password`),
  shortcuts: () => openUrl(SHORTCUTS_URL),
  settings: () => openOptions(),
};

export interface MenuItem {
  labelKey: 'openSidePanel' | 'openWorkspace' | 'settings';
  icon: typeof Settings;
  /** `windowId` is the window the click came from — the side panel opens in it. */
  go: (windowId: number) => Promise<void>;
}

export const MENU: readonly MenuItem[] = [
  { labelKey: 'openSidePanel', icon: PanelRight, go: (windowId) => openSidePanel(windowId) },
  { labelKey: 'openWorkspace', icon: ExternalLink, go: () => LINKS.workspace() },
  { labelKey: 'settings', icon: Settings, go: () => LINKS.settings() },
];
