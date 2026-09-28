import { ContainerModule } from 'inversify';
import { TOKENS } from '../../di/tokens';
import type { FeatureFlagsClientContext } from './feature-flags.client';
import { FeatureFlagsRepository } from './feature-flags.repository';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Feature flags, loaded by the app through `FlamaApp.create({ modules })`:
 * `createFeatureFlagsModule({ platform: 'web', appVersion })`. The context is
 * what the app reports about itself when it asks for its flags.
 */
export function createFeatureFlagsModule(context: FeatureFlagsClientContext = {}): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind<FeatureFlagsClientContext>(TOKENS.FeatureFlagsClientContext).toConstantValue(context);
    bind(TOKENS.FeatureFlagsRepository).to(FeatureFlagsRepository).inSingletonScope();
    bind(TOKENS.FeatureFlagsService).to(FeatureFlagsService).inSingletonScope();
  });
}
