import type { LoggerService } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { QuietBootLogger } from '../quiet-boot.logger';

function inner() {
  return { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } satisfies LoggerService;
}

describe('QuietBootLogger', () => {
  // A line per module and per route at every start, ahead of anything useful.
  it("moves Nest's module and route listing to debug", () => {
    const target = inner();
    const logger = new QuietBootLogger(target);

    logger.log('Mapped {/api/users, GET} route', 'RouterExplorer');
    logger.log('AuthModule dependencies initialized', 'InstanceLoader');

    expect(target.log).not.toHaveBeenCalled();
    expect(target.debug).toHaveBeenCalledWith('Mapped {/api/users, GET} route', 'RouterExplorer');
    expect(target.debug).toHaveBeenCalledTimes(2);
  });

  it('passes every other line through at its own level', () => {
    const target = inner();
    const logger = new QuietBootLogger(target);

    logger.log({ message: 'user signed in' }, 'UsersController');
    logger.log('Nest application successfully started', 'NestApplication');
    logger.warn('Unsupported route path', 'RoutesResolver');

    expect(target.log).toHaveBeenCalledTimes(2);
    expect(target.warn).toHaveBeenCalledWith('Unsupported route path', 'RoutesResolver');
    expect(target.debug).not.toHaveBeenCalled();
  });
});
