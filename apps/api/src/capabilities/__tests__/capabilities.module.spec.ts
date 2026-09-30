import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { CAPABILITIES, resolveCapabilities } from '../capabilities.module';

function configWith(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('resolveCapabilities', () => {
  it('resolves every row of the table, and each one off on a bare install', () => {
    const bare = resolveCapabilities(configWith({}));
    expect(Object.keys(bare)).toEqual(Object.keys(CAPABILITIES));
    expect(Object.values(bare)).not.toContain(true);
  });
});
