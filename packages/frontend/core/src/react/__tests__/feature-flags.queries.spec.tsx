import { KILL_SWITCH } from '@flama/shared/feature-flags/testing';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FlamaApp } from '../../di/flama-app';
import { createAuthStore } from '../../modules/auth/auth.state';
import { FlamaProvider } from '../context';
import {
  featureFlagKeys,
  useFeatureFlag,
  useFeatureFlags,
  useFeatureFlagValue,
} from '../feature-flags.queries';

// The starter declares no flags; the machinery is tested on a catalog of its own.
vi.mock('@flama/shared/feature-flags/catalog', async (importOriginal) => {
  const { withTestFlags } = await import('@flama/shared/feature-flags/testing');
  return withTestFlags(
    await importOriginal<typeof import('@flama/shared/feature-flags/catalog')>(),
  );
});

function setup(flags: Record<string, boolean | string> = {}) {
  const get = vi.fn().mockResolvedValue({ version: 'v1', flags });
  const recordExposure = vi.fn();
  const store = createAuthStore();

  const app = {
    container: { get: () => ({ get, recordExposure }) },
    auth: { store },
  } as unknown as FlamaApp;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <FlamaProvider app={app}>{children}</FlamaProvider>
      </QueryClientProvider>
    );
  }

  return { wrapper, get, recordExposure, store, queryClient };
}

describe('useFeatureFlag', () => {
  it('reads the catalog default before the answer, then the answer', async () => {
    const { wrapper } = setup({ kill_switch: false });
    const { result } = renderHook(() => useFeatureFlag(KILL_SWITCH), { wrapper });

    // A kill switch: live until told otherwise.
    expect(result.current).toBe(true);
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('keeps the catalog default when the flags cannot be fetched', async () => {
    const { wrapper, get } = setup();
    get.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(
      () => ({ enabled: useFeatureFlag(KILL_SWITCH), query: useFeatureFlags() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.enabled).toBe(true);
  });

  // Twenty flag reads on a screen must not become twenty requests.
  it('shares one fetch across every read', async () => {
    const { wrapper, get } = setup({ kill_switch: true });
    const { result } = renderHook(
      () => ({
        a: useFeatureFlag(KILL_SWITCH),
        b: useFeatureFlagValue(KILL_SWITCH),
        all: useFeatureFlags(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.all.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('reports the value it served for exposure, once the server has answered', async () => {
    const { wrapper, recordExposure } = setup({ kill_switch: false });
    renderHook(() => useFeatureFlag(KILL_SWITCH), { wrapper });

    await waitFor(() => expect(recordExposure).toHaveBeenCalledWith(KILL_SWITCH, false));
    expect(recordExposure).not.toHaveBeenCalledWith(KILL_SWITCH, true);
  });
});

describe('sticky reads', () => {
  it('hold the first answer while a live read follows the refetch', async () => {
    const { wrapper, get, queryClient } = setup({ kill_switch: true });
    const { result } = renderHook(
      () => ({
        sticky: useFeatureFlag(KILL_SWITCH, { sticky: true }),
        live: useFeatureFlag(KILL_SWITCH),
        query: useFeatureFlags(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    get.mockResolvedValue({ version: 'v2', flags: { kill_switch: false } });
    await act(() => queryClient.invalidateQueries({ queryKey: featureFlagKeys.all }));

    await waitFor(() => expect(result.current.live).toBe(false));
    expect(result.current.sticky).toBe(true);
  });

  it('latch afresh when the caller signs in', async () => {
    const { wrapper, get, store } = setup({ kill_switch: true });
    const { result } = renderHook(() => useFeatureFlag(KILL_SWITCH, { sticky: true }), {
      wrapper,
    });
    await waitFor(() => expect(result.current).toBe(true));

    get.mockResolvedValue({ version: 'v2', flags: { kill_switch: false } });
    act(() => store.setState({ isAuthenticated: true }));

    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('featureFlagKeys', () => {
  // The login page's anonymous flags must not be what the dashboard renders.
  it('separates a signed-in caller from an anonymous one', async () => {
    const { wrapper, get, store } = setup({ kill_switch: true });
    const { result } = renderHook(() => useFeatureFlags(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => store.setState({ isAuthenticated: true }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });
});
