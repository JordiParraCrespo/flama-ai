import type { CommandBus } from '@nestjs/cqrs';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AdminUserResponseDto } from '../../../dtos/admin-user.response.dto';
import { ImpersonateUserCommand } from '../impersonate-user.command';
import { ImpersonateUserHttpController } from '../impersonate-user.http.controller';

const user = { id: 'u1', email: 'a@b.com' } as AdminUserResponseDto;
const request = { headers: { cookie: 'session=abc' } } as unknown as Request;

function setUp(cookies: string[]) {
  const execute = vi.fn().mockResolvedValue({ user, cookies });
  const response = { setHeader: vi.fn() };
  const controller = new ImpersonateUserHttpController({ execute } as unknown as CommandBus);
  return { execute, response, controller };
}

describe('ImpersonateUserHttpController', () => {
  it('dispatches the command and forwards the impersonation cookie', async () => {
    const { execute, response, controller } = setUp(['session=impersonated; Path=/']);

    const result = await controller.impersonateUser(request, response as unknown as Response, 'u1');

    expect(result).toBe(user);
    const command = execute.mock.calls[0][0] as ImpersonateUserCommand;
    expect(command).toBeInstanceOf(ImpersonateUserCommand);
    expect(command.userId).toBe('u1');
    expect(command.headers).toBe(request.headers);
    expect(response.setHeader).toHaveBeenCalledWith('set-cookie', ['session=impersonated; Path=/']);
  });

  it('sets no cookie header when Better Auth returned none', async () => {
    const { response, controller } = setUp([]);

    await controller.impersonateUser(request, response as unknown as Response, 'u1');

    expect(response.setHeader).not.toHaveBeenCalled();
  });
});
