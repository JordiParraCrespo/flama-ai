import { describe, expect, it, vi } from 'vitest';
import type { AdminAuthPort } from '../../../infrastructure/admin-auth.port';
import { BanUserCommand } from '../ban-user.command';
import { BanUserCommandHandler } from '../ban-user.command-handler';

describe('BanUserCommandHandler', () => {
  it('hands the request headers and the user to the port', async () => {
    const admin = { banUser: vi.fn().mockResolvedValue({ success: true }) };
    const headers = { cookie: 'session=abc' };

    await new BanUserCommandHandler(admin as unknown as AdminAuthPort).execute(
      new BanUserCommand({
        headers,
        userId: 'u1',
        ban: { banReason: 'abuse', banExpiresIn: 3600 },
      }),
    );

    expect(admin.banUser).toHaveBeenCalledWith(headers, 'u1', {
      banReason: 'abuse',
      banExpiresIn: 3600,
    });
  });
});
