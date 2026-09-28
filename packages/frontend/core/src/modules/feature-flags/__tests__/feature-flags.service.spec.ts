import { CHECKOUT_COPY, KILL_SWITCH } from '@flama/shared/feature-flags/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_EVENTS } from '../../analytics/analytics.events';
import type { AnalyticsService } from '../../analytics/analytics.service';
import { type AuthStore, createAuthStore } from '../../auth/auth.state';
import type { FeatureFlagsRepository } from '../feature-flags.repository';
import { FeatureFlagsService } from '../feature-flags.service';

// The starter declares no flags; the machinery is tested on a catalog of its own.
vi.mock('@flama/shared/feature-flags/catalog', async (importOriginal) => {
  const { withTestFlags } = await import('@flama/shared/feature-flags/testing');
  return withTestFlags(
    await importOriginal<typeof import('@flama/shared/feature-flags/catalog')>(),
  );
});

describe('FeatureFlagsService', () => {
  let repository: { get: ReturnType<typeof vi.fn> };
  let analytics: { capture: ReturnType<typeof vi.fn> };
  let service: FeatureFlagsService;
  let auth: AuthStore;

  beforeEach(() => {
    repository = { get: vi.fn().mockResolvedValue({ version: 'v1', flags: {} }) };
    analytics = { capture: vi.fn() };
    auth = createAuthStore();
    service = new FeatureFlagsService(
      repository as unknown as FeatureFlagsRepository,
      { platform: 'ios', appVersion: '2.1.0' },
      analytics as unknown as AnalyticsService,
      auth,
    );
  });

  it('asks for the flags with the platform and build the app reported', async () => {
    await service.get();
    expect(repository.get).toHaveBeenCalledWith({ platform: 'ios', appVersion: '2.1.0' });
  });

  // Rejecting is what lets the query keep the last good answer; resolving to
  // defaults would turn a pulled kill switch back on during a network blip.
  it('lets a failure reject rather than resolving to defaults', async () => {
    repository.get.mockRejectedValue(new Error('offline'));
    await expect(service.get()).rejects.toThrow('offline');
  });

  it('records an experiment exposure once per variant', () => {
    service.recordExposure(CHECKOUT_COPY, 'bold');
    service.recordExposure(CHECKOUT_COPY, 'bold');
    service.recordExposure(CHECKOUT_COPY, 'control');

    expect(analytics.capture).toHaveBeenCalledTimes(2);
    expect(analytics.capture).toHaveBeenCalledWith(ANALYTICS_EVENTS.FEATURE_FLAG_EXPOSED, {
      flag: 'checkout_copy',
      variant: 'bold',
    });
  });

  it('records the same variant again for the next person to sign in', () => {
    auth.setState({ isAuthenticated: true });
    service.recordExposure(CHECKOUT_COPY, 'bold');
    auth.setState({ isAuthenticated: false });
    auth.setState({ isAuthenticated: true });
    service.recordExposure(CHECKOUT_COPY, 'bold');
    expect(analytics.capture).toHaveBeenCalledTimes(2);
  });

  it('records nothing for a flag that is not an experiment', () => {
    service.recordExposure(KILL_SWITCH, true);
    expect(analytics.capture).not.toHaveBeenCalled();
  });
});
