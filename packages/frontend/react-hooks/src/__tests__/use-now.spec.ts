import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from '../hooks/use-now';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNow', () => {
  it('starts at the current time and moves once per interval', () => {
    const start = Date.now();
    const { result } = renderHook(() => useNow(60_000));
    expect(result.current).toBe(start);

    act(() => vi.advanceTimersByTime(59_999));
    expect(result.current).toBe(start);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(start + 60_000);
  });

  it('stops its timer on unmount', () => {
    const { unmount } = renderHook(() => useNow(1_000));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
