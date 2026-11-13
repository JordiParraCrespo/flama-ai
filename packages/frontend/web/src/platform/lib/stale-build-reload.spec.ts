import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reloadOnStaleBuild } from './stale-build-reload';

/**
 * A stale hashed chunk reloads the page once, then falls through to the
 * screen's own error state; a storage that refuses the stamp never reloads,
 * since a chunk that is really gone would otherwise reload the page for ever;
 * and the failure is never swallowed, since an import that resolved to nothing
 * crashed the router before the reload landed.
 */
function fakeWindow({ storageRefused = false } = {}) {
  const target = new EventTarget();
  const stored = new Map<string, string>();
  const reload = vi.fn();
  const refuse = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  const win = {
    addEventListener: target.addEventListener.bind(target),
    sessionStorage: storageRefused
      ? { getItem: refuse, setItem: refuse }
      : {
          getItem: (key) => stored.get(key) ?? null,
          setItem: (key, value) => void stored.set(key, value),
        },
    location: { reload },
  };
  vi.stubGlobal('window', win);
  const fail = () => {
    const event = new Event('vite:preloadError', { cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  /**
   * A route's lazy `import()` as a Vite build compiles it: on a failure the
   * helper fires `vite:preloadError` and rethrows only when nobody cancelled
   * the event; a cancelled one resolves the import to `undefined`.
   */
  const importStaleChunk = async (): Promise<{ component: unknown } | undefined> => {
    const failure = new TypeError(
      'Failed to fetch dynamically imported module: https://app.test/assets/settings-BAiNbrnn.js',
    );
    const event = new Event('vite:preloadError', { cancelable: true });
    target.dispatchEvent(event);
    if (!event.defaultPrevented) throw failure;
    return undefined;
  };
  return { reload, fail, importStaleChunk };
}

describe('reloadOnStaleBuild', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reloads on a chunk that failed to load', () => {
    const { reload, fail } = fakeWindow();
    reloadOnStaleBuild();
    fail();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('lets the import reject with the loader error while the reload is on its way', async () => {
    // Cancelling the event made the import resolve to nothing, and the router
    // threw "Cannot read properties of undefined (reading 'component')" before
    // the page went.
    const { reload, importStaleChunk } = fakeWindow();
    reloadOnStaleBuild();
    await expect(importStaleChunk()).rejects.toThrow(/Failed to fetch dynamically imported module/);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('lets a second failure right after a reload through, instead of looping', () => {
    const { reload, fail } = fakeWindow();
    reloadOnStaleBuild();
    fail();
    vi.advanceTimersByTime(2_000);
    fail();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('never reloads when storage refuses the guard, which would loop on a chunk every load asks for', () => {
    const { reload, fail } = fakeWindow({ storageRefused: true });
    reloadOnStaleBuild();
    fail();
    expect(reload).not.toHaveBeenCalled();
  });

  it('restarts the quiet window on every failure, so a burst reloads once', () => {
    const { reload, fail } = fakeWindow();
    reloadOnStaleBuild();
    fail();
    vi.advanceTimersByTime(8_000);
    fail();
    vi.advanceTimersByTime(8_000);
    fail();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('reloads again once the guard has passed', () => {
    const { reload, fail } = fakeWindow();
    reloadOnStaleBuild();
    fail();
    vi.advanceTimersByTime(60_000);
    fail();
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
