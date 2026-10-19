import { connectDevReload } from '@/runtime/dev-reload';
import { listen } from '@/runtime/messaging';
import { openOptions } from '@/runtime/tabs';
import { clearClips, removeClip } from './clips';
import { createMenus, onMenuClick } from './menus';
import { saveTab, saveTabQuietly } from './save-tab';

/**
 * The service worker: the extension's one long-lived program, which Chrome
 * nevertheless stops after thirty idle seconds and starts again for the next
 * event. So it keeps no state in memory — what must last is in
 * `chrome.storage` — and it registers every listener here, synchronously, at
 * the top level: Chrome hands the event that woke a worker only to listeners
 * added in its first turn.
 *
 * It holds no React and no session. It does what has to outlive a page (a
 * save the popup started and then closed on) and what has no page at all (the
 * menu, the shortcut).
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  createMenus();
  // A first install opens the options page, which signs the person in and
  // says what the extension can and cannot see.
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) void openOptions();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void onMenuClick(info, tab);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'save-page') void saveTabQuietly(tab?.id);
});

listen({
  'clips/save-tab': ({ tabId }) => saveTab(tabId),
  'clips/remove': ({ id }) => removeClip(id),
  'clips/clear': () => clearClips(),
});

if (import.meta.env.DEV) connectDevReload();
