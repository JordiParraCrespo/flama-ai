import type { CommandBus } from '@nestjs/cqrs';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AdminUserResponseDto } from '../../../dtos/admin-user.response.dto';
import { StopImpersonatingHttpController } from '../stop-impersonating.http.controller';

describe('StopImpersonatingHttpController', () => {
  it('forwards the restored session cookie', async () => {
    const user = { id: 'admin-1' } as AdminUserResponseDto;
    const execute = vi.fn().mockResolvedValue({ user, cookies: ['session=admin; Path=/'] });
    const response = { setHeader: vi.fn() };
    const controller = new StopImpersonatingHttpController({ execute } as unknown as CommandBus);

    const result = await controller.stopImpersonating(
      { headers: {} } as unknown as Request,
      response as unknown as Response,
    );

    expect(result).toBe(user);
    expect(response.setHeader).toHaveBeenCalledWith('set-cookie', ['session=admin; Path=/']);
  });
});
