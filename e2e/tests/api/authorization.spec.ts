import { expect, test } from '@playwright/test';
import { newContext, signedUpContext } from '../../support/auth';
import { findUserByEmail } from '../../support/db';

/**
 * What a plain, self-registered user may do to *other* people's records.
 *
 * The tests marked `test.fail()` describe the behaviour the app should have;
 * they pass while the bug is present and turn red the moment it is fixed, which
 * is the signal to delete the annotation. Each one names the issue it tracks.
 */
test.describe('authorization boundaries for a default user', () => {
  test.fail(
    true,
    'BUG #68: the seeded `user` role holds an unconditional `update User`, so ' +
      'any signed-in user can PATCH anyone — including setting `role`, which ' +
      'the Better Auth admin plugin then honours.',
  );
  test('cannot escalate their own role to admin', async () => {
    const { api, userId } = await signedUpContext('escalate');

    const response = await api.patch(`/api/v1/users/${userId}`, {
      data: { role: 'admin' },
      failOnStatusCode: false,
    });

    expect(
      response.status(),
      'a self-service profile update must never accept a privilege field',
    ).toBe(403);
  });
});

test.describe('cross-user writes', () => {
  test.fail(
    true,
    'BUG #68: same unconditional `update User` permission — no check ties `:id` to the caller.',
  );
  test("cannot modify another user's profile", async () => {
    const { user: victim, userId: victimId } = await signedUpContext('crossvictim');
    const { api } = await signedUpContext('crossattacker');

    const response = await api.patch(`/api/v1/users/${victimId}`, {
      data: { firstName: 'Overwritten' },
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(403);
    expect((await findUserByEmail(victim.email))?.firstName).not.toBe('Overwritten');
  });
});

test.describe('user directory exposure', () => {
  test.fail(
    true,
    'BUG #112: the `user` role holds an unconditional `read User`, so the whole ' +
      'user directory (every email address) is readable by any account.',
  );
  test('cannot list every user in the deployment', async () => {
    const { api } = await signedUpContext('directory');

    const response = await api.get('/api/v1/users?limit=100', {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('boundaries that do hold', () => {
  test('cannot delete another user', async () => {
    const { userId: victimId } = await signedUpContext('delvictim');
    const { api } = await signedUpContext('delattacker');

    const response = await api.delete(`/api/v1/users/${victimId}`, {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(403);
  });

  test('cannot reach the Better Auth admin plugin', async () => {
    const { api } = await signedUpContext('adminplugin');

    const response = await api.get('/api/auth/admin/list-users?limit=1', {
      failOnStatusCode: false,
    });

    expect(response.status(), 'the admin plugin is gated on the user role').toBeGreaterThanOrEqual(
      400,
    );
  });

  test('cannot impersonate another user', async () => {
    const { userId: victimId } = await signedUpContext('impvictim');
    const { api } = await signedUpContext('impattacker');

    const response = await api.post('/api/auth/admin/impersonate-user', {
      data: { userId: victimId },
      failOnStatusCode: false,
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('anonymous callers cannot touch the user routes at all', async () => {
    const api = await newContext();
    const { userId } = await signedUpContext('anonvictim');

    for (const call of [
      api.get('/api/v1/users', { failOnStatusCode: false }),
      api.get(`/api/v1/users/${userId}`, { failOnStatusCode: false }),
      api.patch(`/api/v1/users/${userId}`, {
        data: { firstName: 'X' },
        failOnStatusCode: false,
      }),
      api.delete(`/api/v1/users/${userId}`, { failOnStatusCode: false }),
    ]) {
      expect((await call).status()).toBe(401);
    }
  });
});
