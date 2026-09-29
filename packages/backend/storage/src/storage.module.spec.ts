import type { FactoryProvider } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { LocalStorageService } from './local-storage.service';
import { StorageModule } from './storage.module';

/** The factory `StorageModule` binds to `StorageService`, called with `values` as config. */
function build(values: Record<string, unknown>) {
  const [provider] = StorageModule.register({ local: LocalStorageService })
    .providers as FactoryProvider[];
  const config = {
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`${key} is not configured`);
      return values[key];
    },
    get: (key: string) => values[key],
  } as unknown as ConfigService;
  return provider.useFactory(config);
}

describe('StorageModule', () => {
  it('builds the driver the config names', () => {
    expect(build({ 'storage.provider': 'local' })).toBeInstanceOf(LocalStorageService);
  });

  it('refuses a name no driver is registered under', () => {
    // The app's config schema rejects it first; this is the module's own
    // guard, so a typo never falls through to some other driver.
    expect(() => build({ 'storage.provider': 'nowhere' })).toThrow(/No storage driver named/);
    expect(() => build({ 'storage.provider': 'toString' })).toThrow(/No storage driver named/);
  });

  it('needs a provider to be configured', () => {
    expect(() => build({})).toThrow(/storage.provider/);
  });
});
