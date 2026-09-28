import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedCallback } from '../hooks/use-debounced-callback';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebouncedCallback', () => {
  it('calls the latest callback once, with the last arguments', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useDebouncedCallback(fn, 200), {
      initialProps: { fn: first },
    });

    act(() => {
      result.current('a');
      result.current('ab');
    });
    rerender({ fn: latest });
    act(() => vi.advanceTimersByTime(200));

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
    expect(latest).toHaveBeenCalledWith('ab');
  });

  it('drops the pending call when the cancel key changes', () => {
    const fn = vi.fn();
    const { result, rerender } = renderHook(({ key }) => useDebouncedCallback(fn, 200, key), {
      initialProps: { key: 0 },
    });

    act(() => result.current());
    rerender({ key: 1 });
    act(() => vi.advanceTimersByTime(200));

    expect(fn).not.toHaveBeenCalled();
  });

  it('drops the pending call on unmount', () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 200));

    act(() => result.current());
    unmount();
    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();
  });
});
