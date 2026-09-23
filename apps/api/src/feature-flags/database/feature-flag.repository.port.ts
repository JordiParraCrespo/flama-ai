import type { RepositoryPort } from '@flama/backend-ddd';
import type { Option } from 'oxide.ts';
import type { FeatureFlagEntity } from '../domain/feature-flag.entity';

/** Port for the flag-targeting aggregate. Implemented by `feature-flag.repository.ts`. */
export interface FeatureFlagRepositoryPort extends RepositoryPort<FeatureFlagEntity> {
  findOneByKey(key: string): Promise<Option<FeatureFlagEntity>>;
  /**
   * A cheap value that changes whenever any row is written or removed. Each
   * replica polls it to decide whether its in-memory snapshot is stale, so it
   * must cost one indexed aggregate, not a table read.
   */
  fingerprint(): Promise<string>;
}
