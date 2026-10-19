/**
 * Tabs, windows and the extension's own surfaces, as the rest of the code
 * needs them. Every `chrome.tabs`, `chrome.scripting` and `chrome.sidePanel`
 * call in the extension is one of these.
 */

/** Where Chrome lists and edits every extension's shortcuts. */
export const SHORTCUTS_URL = 'chrome://extensions/shortcuts';

/**
 * Whether an extension may script this page at all. Chrome keeps its own
 * pages (`chrome://`, `chrome-extension://`, the new tab page), `file://`
 * unless the person opted in, and the Web Store off limits to every
 * extension; asking anyway is an error the person would read as ours.
 */
export function isScriptable(url: string | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (parsed.hostname === 'chromewebstore.google.com') return false;
  if (parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore')) {
    return false;
  }
  return true;
}

/**
 * The tab the person is looking at. From a page, `currentWindow` is the
 * window the page belongs to; the service worker has none, and asks for the
 * last focused one.
 */
export async function activeTab(
  from: 'page' | 'worker' = 'page',
): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query(
    from === 'page'
      ? { active: true, currentWindow: true }
      : { active: true, lastFocusedWindow: true },
  );
  return tab;
}

/**
 * Put the content script into a tab. Needs the `activeTab` grant Chrome gives
 * when the person invokes the extension on that tab (toolbar, context menu,
 * shortcut) — there is no standing access to inject with. Injecting twice is
 * harmless: the script returns early the second time.
 */
export async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
}

/**
 * Must run inside the click that asked for it: Chrome requires a user gesture,
 * and the gesture does not survive an `await`. So the window id is read before
 * the click (`currentWindowId`), and this is the first call the click makes.
 */
export async function openSidePanel(windowId: number): Promise<void> {
  await chrome.sidePanel.open({ windowId });
}

export async function openOptions(): Promise<void> {
  await chrome.runtime.openOptionsPage();
}

export async function openUrl(url: string): Promise<void> {
  await chrome.tabs.create({ url });
}

/** The keys bound to one of the manifest's `commands`, as Chrome prints them; empty if unbound. */
export async function shortcutFor(command: string): Promise<string> {
  const commands = await chrome.commands.getAll();
  return commands.find((entry) => entry.name === command)?.shortcut ?? '';
}

/**
 * A mark on the toolbar icon for one tab, gone after a moment: how the
 * worker answers a shortcut or a menu click on a page it could not touch,
 * where there is no page to show a toast in.
 */
export async function flashBadge(tabId: number, text: string, color: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ tabId, color });
  await chrome.action.setBadgeText({ tabId, text });
  setTimeout(() => {
    void chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
  }, 2_500);
}

/** The window this page belongs to. Read ahead of a click: see `openSidePanel`. */
export async function currentWindowId(): Promise<number | undefined> {
  return (await chrome.windows.getCurrent()).id;
}
