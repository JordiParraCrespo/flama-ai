import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { resolveCapabilities } from '../capabilities.module';

function configWith(values: Record<string, unknown>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('resolveCapabilities', () => {
  it('reports everything off on a bare install', () => {
    const bare = resolveCapabilities(configWith({}));
    expect(bare).toEqual({});
    expect(Object.entries(bare).filter(([, on]) => on)).toEqual([]);
  });
});
