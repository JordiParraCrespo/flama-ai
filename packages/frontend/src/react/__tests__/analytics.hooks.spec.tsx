import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FlamaApp } from '../../di/flama-app';
import { ANALYTICS_EVENTS, type AnalyticsEvent } from '../../modules/analytics/analytics.events';
import { useCaptureEvent, useCaptureOnMount } from '../analytics.hooks';
import { useFeatureFlag, useFeatureFlags, useFeatureFlagValue } from '../analytics.queries';
import { FlamaProvider } from '../context';

type FakeFlags = Record<string, boolean | string>;

function setup(overrides: { flags?: FakeFlags; getFeatureFlags?: () => Promise<FakeFlags> } = {}) {
  const capture = vi.fn();
  const onFeatureFlags = vi.fn().mockReturnValue(() => {});
  const getFeatureFlags =
    overrides.getFeatureFlags ?? vi.fn().mockResolvedValue(overrides.flags ?? {});

  const app = {
    analytics: { capture, getFeatureFlags, onFeatureFlags },
  } as unknown as FlamaApp;

  // Retries would turn a deliberate failure into a multi-second test, and
  // caching across tests would leak one case's flags into the next.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <FlamaProvider app={app}>{children}</FlamaProvider>
      </QueryClientProvider>
    );
  }

  return { wrapper, capture, getFeatureFlags, onFeatureFlags, queryClient };
}

describe('useCaptureEvent', () => {
  it('captures through the service', () => {
    const { wrapper, capture } = setup();
    const { result } = renderHook(() => useCaptureEvent(), { wrapper });

    act(() => {
      result.current(ANALYTICS_EVENTS.USER_SIGNED_IN, { method: 'password' });
    });

    expect(capture).toHaveBeenCalledWith(ANALYTICS_EVENTS.USER_SIGNED_IN, {
      method: 'password',
    });
  });

  // The whole reason this hook exists rather than reaching for
  // `useAnalytics().capture`: an unstable identity defeats memoized children
  // and makes the callback unsafe to put in a dependency array.
  it('keeps a stable identity across re-renders', () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useCaptureEvent(), {
      wrapper,
    });

    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });
});

describe('useCaptureOnMount', () => {
  it('captures once on mount', () => {
    const { wrapper, capture } = setup();
    renderHook(() => useCaptureOnMount(ANALYTICS_EVENTS.USER_SIGNED_UP), {
      wrapper,
    });

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(ANALYTICS_EVENTS.USER_SIGNED_UP, undefined);
  });

  // A fresh object literal every render is the normal call shape. If that
  // re-fired the capture, a component that renders ten times would report ten
  // impressions of the same thing.
  it('does not re-capture when properties get a new object identity', () => {
    const { wrapper, capture } = setup();
    const { rerender } = renderHook(
      () => useCaptureOnMount(ANALYTICS_EVENTS.USER_SIGNED_UP, { source: 'login' }),
      { wrapper },
    );

    rerender();
    rerender();

    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('sends the latest properties, not the ones from first render', () => {
    const { wrapper, capture } = setup();
    renderHook(({ source }) => useCaptureOnMount(ANALYTICS_EVENTS.USER_SIGNED_UP, { source }), {
      wrapper,
      initialProps: { source: 'login' },
    });

    expect(capture).toHaveBeenCalledWith(ANALYTICS_EVENTS.USER_SIGNED_UP, {
      source: 'login',
    });
  });

  // A component reused across events — the same banner rendering a different
  // event key — should report the new one.
  it('captures again when the event name changes', () => {
    const { wrapper, capture } = setup();
    const { rerender } = renderHook(
      ({ event }: { event: AnalyticsEvent }) => useCaptureOnMount(event),
      {
        wrapper,
        initialProps: {
          event: ANALYTICS_EVENTS.USER_SIGNED_UP as AnalyticsEvent,
        },
      },
    );

    rerender({ event: ANALYTICS_EVENTS.USER_SIGNED_IN });

    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.USER_SIGNED_IN, undefined);
  });

  it('captures once per mounted component, not once per tree', async () => {
    const { wrapper: Wrapper, capture } = setup();

    function Banner() {
      useCaptureOnMount(ANALYTICS_EVENTS.USER_SIGNED_UP);
      return null;
    }

    render(
      <Wrapper>
        <Banner />
        <Banner />
      </Wrapper>,
    );

    await waitFor(() => expect(capture).toHaveBeenCalledTimes(2));
  });
});

describe('feature flag hooks', () => {
  it('reads a boolean flag once it loads', async () => {
    const { wrapper } = setup({ flags: { 'new-checkout': true } });
    const { result } = renderHook(() => useFeatureFlag('new-checkout'), {
      wrapper,
    });

    // Control branch first — the contract every caller depends on.
    expect(result.current).toBe(false);

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('treats a multivariate variant as enabled and exposes its value', async () => {
    const { wrapper } = setup({ flags: { 'pricing-copy': 'variant-b' } });

    const flag = renderHook(() => useFeatureFlag('pricing-copy'), { wrapper });
    const value = renderHook(() => useFeatureFlagValue('pricing-copy'), {
      wrapper,
    });

    await waitFor(() => expect(flag.result.current).toBe(true));
    await waitFor(() => expect(value.result.current).toBe('variant-b'));
  });

  it('reports an unknown flag as off', async () => {
    const { wrapper } = setup({ flags: { other: true } });
    const { result } = renderHook(() => useFeatureFlag('missing'), { wrapper });

    await waitFor(() => expect(result.current).toBe(false));
    expect(result.current).toBe(false);
  });

  // Twenty flag reads on a page must not become twenty requests — that is the
  // point of routing them through a single query.
  it('shares one fetch across every flag read', async () => {
    const { wrapper, getFeatureFlags } = setup({
      flags: { a: true, b: 'x' },
    });

    const { result } = renderHook(
      () => ({
        a: useFeatureFlag('a'),
        b: useFeatureFlagValue('b'),
        all: useFeatureFlags(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.a).toBe(true));

    expect(getFeatureFlags).toHaveBeenCalledTimes(1);
  });

  it('subscribes to provider-pushed flag reloads', () => {
    const { wrapper, onFeatureFlags } = setup();
    renderHook(() => useFeatureFlag('anything'), { wrapper });

    expect(onFeatureFlags).toHaveBeenCalled();
  });
});
