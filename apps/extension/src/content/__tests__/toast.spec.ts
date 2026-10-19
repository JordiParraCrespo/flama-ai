import { afterEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '../toast';

/**
 * The in-page toast. What breaks if these fail: the page's scripts find it
 * and its CSS restyles it; toasts pile up and never leave.
 */
describe('showToast', () => {
  afterEach(() => {
    vi.useRealTimers();
    for (const host of document.querySelectorAll('#flama-extension-toast')) host.remove();
  });

  it('draws inside a closed shadow root the page cannot reach into', () => {
    const host = showToast({ tone: 'success', message: 'Saved' });
    expect(host.isConnected).toBe(true);
    expect(host.shadowRoot).toBeNull();
    expect(document.querySelector('.toast')).toBeNull();
  });

  it('shows one toast at a time and takes it away after a moment', () => {
    vi.useFakeTimers();
    showToast({ tone: 'success', message: 'one' });
    const second = showToast({ tone: 'error', message: 'two' });
    expect(document.querySelectorAll('#flama-extension-toast')).toHaveLength(1);

    vi.advanceTimersByTime(3_000);
    expect(second.isConnected).toBe(false);
  });
});
