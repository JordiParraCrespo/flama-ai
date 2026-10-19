import { chromeMessage } from '@/runtime/i18n';
import { saveTabQuietly } from './save-tab';

/**
 * The right-click menu. Created on install and update (Chrome keeps menus
 * across worker restarts, so creating them on every wake would throw on the
 * duplicate ids); answered by the listener `index.ts` registers.
 */
const MENU = {
  savePage: 'save-page',
  saveSelection: 'save-selection',
} as const;

export function createMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU.savePage,
      title: chromeMessage('menuSavePage'),
      contexts: ['page'],
    });
    chrome.contextMenus.create({
      id: MENU.saveSelection,
      title: chromeMessage('menuSaveSelection'),
      contexts: ['selection'],
    });
  });
}

export async function onMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  if (info.menuItemId === MENU.savePage) await saveTabQuietly(tab?.id);
  if (info.menuItemId === MENU.saveSelection) await saveTabQuietly(tab?.id, info.selectionText);
}
