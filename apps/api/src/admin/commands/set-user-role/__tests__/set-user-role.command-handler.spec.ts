import { describe, expect, it, vi } from 'vitest';
import type { AdminAuthPort } from '../../../infrastructure/admin-auth.port';
import { SetUserRoleCommand } from '../set-user-role.command';
import { SetUserRoleCommandHandler } from '../set-user-role.command-handler';

describe('SetUserRoleCommandHandler', () => {
  it('hands the request headers and the user to the port', async () => {
    const admin = { setRole: vi.fn().mockResolvedValue({ success: true }) };
    const headers = { cookie: 'session=abc' };

    await new SetUserRoleCommandHandler(admin as unknown as AdminAuthPort).execute(
      new SetUserRoleCommand({ headers, userId: 'u1', role: 'admin' }),
    );

    expect(admin.setRole).toHaveBeenCalledWith(headers, 'u1', 'admin');
  });
});
