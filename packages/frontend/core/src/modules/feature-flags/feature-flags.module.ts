import { ContainerModule } from 'inversify';
import type { FeatureFlagsClientContext } from './feature-flags.client';
import { FeatureFlagsRepository } from './feature-flags.repository';
import { FeatureFlagsService } from './feature-flags.service';
import { FEATURE_FLAGS_TOKENS } from './feature-flags.tokens';

/**
 * Feature flags, loaded by the app through `FlamaApp.create({ modules })`:
 * `createFeatureFlagsModule({ platform: 'web', appVersion })`. The context is
 * what the app reports about itself when it asks for its flags.
 */
export function createFeatureFlagsModule(context: FeatureFlagsClientContext = {}): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind<FeatureFlagsClientContext>(FEATURE_FLAGS_TOKENS.ClientContext).toConstantValue(context);
    bind(FEATURE_FLAGS_TOKENS.Repository).to(FeatureFlagsRepository).inSingletonScope();
    bind(FEATURE_FLAGS_TOKENS.Service).to(FeatureFlagsService).inSingletonScope();
  });
}
