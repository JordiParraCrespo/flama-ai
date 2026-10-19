import { chromeMessage } from '@/runtime/i18n';
import type { Clip } from '@/runtime/items';
import { MessageError, sendToTab } from '@/runtime/messaging';
import { flashBadge, injectContentScript, isScriptable } from '@/runtime/tabs';
import { addClip } from './clips';

/** Why a save failed, for the page that asked to word it. */
export const SAVE_ERRORS = {
  /** Chrome lets no extension script this page. */
  restricted: 'restricted',
  /** The page would not answer: it is still loading, or it navigated away. */
  unreadable: 'unreadable',
} as const;

/**
 * Save what a tab shows: put the content script in, ask it for the page, keep
 * a clip, and say so in the page. `quote` overrides the selection the page
 * reports — a context-menu click hands over the text it was opened on.
 */
export async function saveTab(tabId: number, quote?: string): Promise<Clip> {
  const tab = await chrome.tabs.get(tabId);
  if (!isScriptable(tab.url)) {
    throw new MessageError('This page cannot be read by extensions', SAVE_ERRORS.restricted);
  }

  let snapshot: Awaited<ReturnType<typeof readPage>>;
  try {
    snapshot = await readPage(tabId);
  } catch {
    throw new MessageError('The page did not answer', SAVE_ERRORS.unreadable);
  }

  const clip = await addClip({
    url: snapshot.url,
    title: snapshot.title.trim() || snapshot.url,
    quote: (quote ?? snapshot.selection).trim(),
  });
  // The toast is a courtesy: a page that navigated away cannot show it, and
  // the clip is already kept.
  await sendToTab(tabId, 'page/toast', {
    tone: 'success',
    message: chromeMessage('toastSaved'),
  }).catch(() => {});
  return clip;
}

async function readPage(tabId: number) {
  await injectContentScript(tabId);
  return sendToTab(tabId, 'page/snapshot');
}

/**
 * The same, for the shortcut and the context menu, where no page is open to
 * show an error: a failure marks the toolbar icon instead.
 */
export async function saveTabQuietly(tabId: number | undefined, quote?: string): Promise<void> {
  if (tabId === undefined) return;
  try {
    await saveTab(tabId, quote);
  } catch {
    await flashBadge(tabId, '!', '#d92d20').catch(() => {});
  }
}
