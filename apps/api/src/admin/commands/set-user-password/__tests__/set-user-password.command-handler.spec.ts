import { describe, expect, it, vi } from 'vitest';
import type { AdminAuthPort } from '../../../infrastructure/admin-auth.port';
import { SetUserPasswordCommand } from '../set-user-password.command';
import { SetUserPasswordCommandHandler } from '../set-user-password.command-handler';

describe('SetUserPasswordCommandHandler', () => {
  it('hands the request headers and the user to the port', async () => {
    const admin = { setPassword: vi.fn().mockResolvedValue({ success: true }) };
    const headers = { cookie: 'session=abc' };

    await new SetUserPasswordCommandHandler(admin as unknown as AdminAuthPort).execute(
      new SetUserPasswordCommand({ headers, userId: 'u1', newPassword: 'new-secret' }),
    );

    expect(admin.setPassword).toHaveBeenCalledWith(headers, 'u1', 'new-secret');
  });
});
