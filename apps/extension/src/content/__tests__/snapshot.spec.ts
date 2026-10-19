import { describe, expect, it } from 'vitest';
import { MAX_QUOTE, readSnapshot } from '../snapshot';

/**
 * What the content script reads off a page. What breaks if these fail: a
 * selection spanning paragraphs is saved with its layout's whitespace; a whole
 * selected article is saved as the "quote".
 */
describe('readSnapshot', () => {
  const page = (head: string) => {
    const document = new DOMParser().parseFromString(
      `<html><head><title>The title</title>${head}</head><body></body></html>`,
      'text/html',
    );
    return document;
  };
  const selecting = (text: string) => ({ toString: () => text }) as Selection;

  it('reads the title, the address and the page summary', () => {
    const document = page('<meta name="description" content=" About it. ">');
    const snapshot = readSnapshot(document, null);
    expect(snapshot).toEqual({
      url: document.URL,
      title: 'The title',
      description: 'About it.',
      selection: '',
    });
  });

  it('falls back to the Open Graph summary', () => {
    const snapshot = readSnapshot(page('<meta property="og:description" content="OG">'), null);
    expect(snapshot.description).toBe('OG');
  });

  it("collapses the selection's whitespace", () => {
    const snapshot = readSnapshot(page(''), selecting('  one\n\n  two\tthree  '));
    expect(snapshot.selection).toBe('one two three');
  });

  it(`keeps at most ${MAX_QUOTE} characters of it`, () => {
    const snapshot = readSnapshot(page(''), selecting('x'.repeat(MAX_QUOTE + 50)));
    expect(snapshot.selection).toHaveLength(MAX_QUOTE);
  });
});
