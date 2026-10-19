import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeChrome, type FakeChrome } from '@/runtime/__tests__/fake-chrome';
import { type Clip, MAX_CLIPS } from '@/runtime/items';
import { addClip, clearClips, removeClip, withClip } from '../clips';

const clip = (n: number, url = `https://example.com/${n}`): Clip => ({
  id: `clip-${n}`,
  url,
  title: `Page ${n}`,
  quote: '',
  savedAt: new Date(2026, 0, 1, 0, n).toISOString(),
});

/**
 * The clips' one writer. What breaks if these fail: saving a page twice
 * lists it twice; the list grows until `chrome.storage.local` refuses writes.
 */
describe('withClip', () => {
  it('puts the new clip first', () => {
    expect(withClip([clip(1)], clip(2)).map((c) => c.id)).toEqual(['clip-2', 'clip-1']);
  });

  it('moves a page saved again to the top instead of repeating it', () => {
    const again = { ...clip(3), url: 'https://example.com/1' };
    expect(withClip([clip(2), clip(1)], again).map((c) => c.id)).toEqual(['clip-3', 'clip-2']);
  });

  it(`keeps at most ${MAX_CLIPS}, dropping the oldest`, () => {
    const full = Array.from({ length: MAX_CLIPS }, (_, n) => clip(n));
    const next = withClip(full, clip(MAX_CLIPS));
    expect(next).toHaveLength(MAX_CLIPS);
    expect(next[0].id).toBe(`clip-${MAX_CLIPS}`);
    expect(next.at(-1)?.id).toBe(`clip-${MAX_CLIPS - 2}`);
  });
});

describe('clip writes', () => {
  let fake: FakeChrome;

  beforeEach(() => {
    fake = createFakeChrome();
    vi.stubGlobal('chrome', fake.chrome);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores what it saved, removes one and clears them all', async () => {
    const saved = await addClip(
      { url: 'https://example.com/a', title: 'A', quote: 'a quote' },
      new Date('2026-10-19T10:00:00.000Z'),
    );
    await addClip({ url: 'https://example.com/b', title: 'B', quote: '' });
    expect(fake.storage.local.clips).toHaveLength(2);
    expect(saved).toMatchObject({ title: 'A', savedAt: '2026-10-19T10:00:00.000Z' });

    await removeClip(saved.id);
    expect((fake.storage.local.clips as Clip[]).map((c) => c.title)).toEqual(['B']);

    await clearClips();
    expect(fake.storage.local.clips).toEqual([]);
  });
});
