import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeChrome, type FakeChrome } from '@/runtime/__tests__/fake-chrome';
import type { Clip } from '@/runtime/items';
import { listen, MessageError } from '@/runtime/messaging';
import { SAVE_ERRORS, saveTab, saveTabQuietly } from '../save-tab';

/**
 * Saving a tab, end to end inside the worker: inject, ask the page, keep the
 * clip, toast. What breaks if these fail: the popup reports a generic error
 * for chrome:// instead of saying why; a page that never answers hangs the
 * save; a failed shortcut leaves no trace at all.
 */
describe('saveTab', () => {
  let fake: FakeChrome;
  let tabUrl: string;
  const toasts: unknown[] = [];

  beforeEach(() => {
    fake = createFakeChrome();
    tabUrl = 'https://example.com/article';
    toasts.length = 0;
    Object.assign(fake.chrome, {
      tabs: {
        ...fake.chrome.tabs,
        get: vi.fn(async (id: number) => ({ id, url: tabUrl })),
      },
      scripting: { executeScript: vi.fn(async () => []) },
      i18n: { getMessage: (key: string) => `[${key}]` },
      action: {
        setBadgeText: vi.fn(async () => {}),
        setBadgeBackgroundColor: vi.fn(async () => {}),
      },
    });
    vi.stubGlobal('chrome', fake.chrome);

    // The content script, answering from its tab.
    fake.as('content');
    listen({
      'page/snapshot': () => ({
        url: tabUrl,
        title: '  An article  ',
        selection: 'the selected words',
        description: '',
      }),
      'page/toast': (toast) => {
        toasts.push(toast);
        return undefined;
      },
    });
    fake.as('worker');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the page, with the selection as its quote, and says so in the page', async () => {
    const clip = await saveTab(7);

    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ['content.js'],
    });
    expect(clip).toMatchObject({
      url: 'https://example.com/article',
      title: 'An article',
      quote: 'the selected words',
    });
    expect((fake.storage.local.clips as Clip[])[0].id).toBe(clip.id);
    expect(toasts).toEqual([{ tone: 'success', message: '[toastSaved]' }]);
  });

  it('prefers the text a context-menu click hands over to the page selection', async () => {
    await expect(saveTab(7, ' from the menu ')).resolves.toMatchObject({ quote: 'from the menu' });
  });

  it('refuses a page Chrome closes to extensions, saying why, without injecting', async () => {
    tabUrl = 'chrome://settings';
    const failure = saveTab(7);
    await expect(failure).rejects.toBeInstanceOf(MessageError);
    await expect(failure).rejects.toMatchObject({ code: SAVE_ERRORS.restricted });
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('reports a page that would not answer as unreadable', async () => {
    vi.mocked(chrome.scripting.executeScript).mockRejectedValueOnce(new Error('Frame removed'));
    await expect(saveTab(7)).rejects.toMatchObject({ code: SAVE_ERRORS.unreadable });
    expect(fake.storage.local.clips).toBeUndefined();
  });

  it('marks the toolbar icon when a shortcut save fails, since no page can show it', async () => {
    tabUrl = 'chrome://newtab';
    await saveTabQuietly(7);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: '!' });
  });
});
