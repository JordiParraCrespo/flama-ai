import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { resolveCapabilities } from '../capabilities.module';

function configWith(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('s3_storage', () => {
  it('is on only when the provider is s3 AND credentials exist', () => {
    const credsButLocalProvider = configWith({
      'storage.provider': 'local',
      's3.accessKeyId': 'key',
      's3.secretAccessKey': 'secret',
    });
    expect(resolveCapabilities(credsButLocalProvider).s3_storage).toBe(false);

    const s3WithoutCreds = configWith({ 'storage.provider': 's3' });
    expect(resolveCapabilities(s3WithoutCreds).s3_storage).toBe(false);

    const s3Configured = configWith({
      'storage.provider': 's3',
      's3.accessKeyId': 'key',
      's3.secretAccessKey': 'secret',
    });
    expect(resolveCapabilities(s3Configured).s3_storage).toBe(true);
  });
});
