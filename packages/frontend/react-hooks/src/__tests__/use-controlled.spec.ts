import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useControlled } from '../hooks/use-controlled';

describe('useControlled', () => {
  it('owns its state while no value is passed, and reports each change', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControlled<number>({ value: undefined, defaultValue: 1, onChange }),
    );

    expect(result.current[0]).toBe(1);
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('composes two functional updates in one event while uncontrolled', () => {
    // The bug this hook existed to prevent, and once had: both updaters read the
    // value the render saw, so the second overwrote the first with the same 1.
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControlled<number>({ value: undefined, defaultValue: 0, onChange }),
    );

    act(() => {
      result.current[1]((count) => count + 1);
      result.current[1]((count) => count + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  it('keeps composing across renders', () => {
    const { result } = renderHook(() =>
      useControlled<number>({ value: undefined, defaultValue: 0 }),
    );

    act(() => result.current[1]((count) => count + 1));
    act(() => result.current[1]((count) => count + 1));

    expect(result.current[0]).toBe(2);
  });

  it('shows the caller’s value while controlled and only asks to change it', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useControlled<number>({ value, defaultValue: 0, onChange }),
      { initialProps: { value: 3 } },
    );

    act(() => result.current[1]((count) => count + 1));
    expect(onChange).toHaveBeenCalledWith(4);
    // The caller has not taken the change, so nothing moved.
    expect(result.current[0]).toBe(3);

    rerender({ value: 4 });
    expect(result.current[0]).toBe(4);
  });

  it('treats null as a controlled value, not as uncontrolled', () => {
    const { result } = renderHook(() =>
      useControlled<string | null>({ value: null, defaultValue: 'a' }),
    );

    act(() => result.current[1]('b'));
    expect(result.current[0]).toBeNull();
  });
});
