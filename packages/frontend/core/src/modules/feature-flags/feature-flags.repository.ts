import { FeatureFlagsApi } from '@flama/api-client';
import type { ClientFeatureFlags } from '@flama/shared';
import { injectable } from 'inversify';
import { AppError } from '../core/errors';
import { MapApiError } from '../core/map-api-error.decorator';
import type { FeatureFlagsClientContext } from './feature-flags.client';
import { FeatureFlagsErrors } from './feature-flags.errors';

/**
 * Reads the caller's evaluated flags (`GET /v1/feature-flags`). Public: a
 * signed-out visitor gets flags too, so the login screen can be flagged.
 */
@injectable()
export class FeatureFlagsRepository {
  @MapApiError(FeatureFlagsErrors.FETCH_FAILED)
  async get(context: FeatureFlagsClientContext): Promise<ClientFeatureFlags> {
    const data = await FeatureFlagsApi.getClientFeatureFlags(context);
    if (!data) throw new AppError(FeatureFlagsErrors.FETCH_FAILED);
    return data;
  }
}
