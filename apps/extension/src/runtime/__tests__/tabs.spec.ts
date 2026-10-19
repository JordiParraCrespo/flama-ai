import { describe, expect, it } from 'vitest';
import { isScriptable } from '../tabs';

/**
 * Which pages the extension may read. What breaks if this fails: the popup
 * offers "Save this page" on chrome:// and the Web Store, and the person gets
 * an error Chrome would always have given.
 */
describe('isScriptable', () => {
  it.each([
    ['https://example.com/article', true],
    ['http://localhost:3000/dashboard', true],
    ['chrome://extensions', false],
    ['chrome-extension://abc/popup.html', false],
    ['https://chromewebstore.google.com/detail/x', false],
    ['https://chrome.google.com/webstore/category/extensions', false],
    ['https://chrome.google.com/search', true],
    ['file:///Users/me/notes.html', false],
    ['about:blank', false],
    ['not a url', false],
    [undefined, false],
  ])('%s → %s', (url, expected) => {
    expect(isScriptable(url)).toBe(expected);
  });
});
