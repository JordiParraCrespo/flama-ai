import type { ClientCapabilities } from '@flama/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FlamaApp, SocialSignInProvider } from '../../di/flama-app';
import { useSocialProviders } from '../auth.queries';
import { FlamaProvider } from '../context';

/**
 * Which social buttons a sign-in screen draws. The providers are the app's
 * (made up here: the kernel names none) and the capabilities the deployment's.
 */
const alpha: SocialSignInProvider = {
  id: 'alpha',
  name: 'Alpha',
  capability: 'alpha_oauth',
  icon: 'alpha',
};
const beta: SocialSignInProvider = {
  id: 'beta',
  name: 'Beta',
  capability: 'beta_oauth',
  icon: 'beta',
};

function setup(socialProviders: SocialSignInProvider[], get: () => Promise<ClientCapabilities>) {
  const app = {
    socialProviders,
    capabilities: { get: vi.fn(get) },
  } as unknown as FlamaApp;

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

  return { wrapper, get: app.capabilities.get };
}

describe('useSocialProviders', () => {
  it('offers only the providers this deployment has configured', async () => {
    const { wrapper } = setup([alpha, beta], async () => ({
      alpha_oauth: false,
      beta_oauth: true,
    }));
    const { result } = renderHook(() => useSocialProviders(), { wrapper });

    await waitFor(() => expect(result.current.available).toEqual([beta]));
    expect(result.current.offered).toEqual([alpha, beta]);
  });

  it('counts every provider as available while the read has not succeeded', async () => {
    const { wrapper, get } = setup([alpha, beta], async () => {
      throw new Error('unreachable');
    });
    const { result } = renderHook(() => useSocialProviders(), { wrapper });

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current.available).toEqual([alpha, beta]);
  });

  it('asks nothing of the deployment when the app offers no provider', () => {
    const { wrapper, get } = setup([], async () => ({}));
    const { result } = renderHook(() => useSocialProviders(), { wrapper });

    expect(result.current).toEqual({ offered: [], available: [] });
    expect(get).not.toHaveBeenCalled();
  });
});
