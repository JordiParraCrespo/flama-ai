import { type APIRequestContext, expect, test } from '@playwright/test';
import { API_URL } from '../../playwright.config';
import { newContext, signedUpContext } from '../../support/auth';

/**
 * Mints a token for the signed-in caller and returns the one-time secret.
 *
 * Minting is deliberately throttled to 10/minute per IP, and every test here
 * shares one IP, so a run can outpace the limiter through no fault of the code
 * under test. Waiting out a 429 keeps the suite testing authorization rather
 * than the rate limiter — which has its own test.
 */
async function mintToken(
  api: APIRequestContext,
  scopes: string[],
  name = 'e2e token',
): Promise<{ status: number; secret?: string; id?: string; body: unknown }> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await api.post('/api/v1/tokens', {
      data: { name, scopes },
      failOnStatusCode: false,
    });
    if (response.status() === 429 && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      continue;
    }
    const body = await response.json().catch(() => ({}));
    return {
      status: response.status(),
      secret: (body as { token?: string }).token,
      id: (body as { id?: string }).id,
      body,
    };
  }
}

/** A context that authenticates purely with a bearer API token. */
async function tokenContext(secret: string): Promise<APIRequestContext> {
  const { request } = await import('@playwright/test');
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${secret}`,
      Origin: 'http://localhost:3000',
    },
  });
}

test.describe('API tokens', () => {
  test('a user can mint a token and use it as a bearer credential', async () => {
    const { api, user } = await signedUpContext('token');

    const minted = await mintToken(api, ['profile:read']);
    expect(minted.status, JSON.stringify(minted.body)).toBe(201);
    expect(minted.secret, 'the secret is returned exactly once').toBeTruthy();

    const asToken = await tokenContext(minted.secret as string);
    const me = await asToken.get('/api/v1/users/me', {
      failOnStatusCode: false,
    });

    expect(me.status()).toBe(200);
    expect((await me.json()).email).toBe(user.email);
  });

  test('a token is refused on a route outside its scopes', async () => {
    const { api } = await signedUpContext('narrowscope');
    const minted = await mintToken(api, ['profile:read'], 'read only');
    test.skip(minted.status !== 201, `could not mint: ${JSON.stringify(minted.body)}`);

    const asToken = await tokenContext(minted.secret as string);
    const write = await asToken.patch('/api/v1/users/me', {
      data: { firstName: 'Nope' },
      failOnStatusCode: false,
    });

    expect(write.status(), 'a read-only token must not write').toBeGreaterThanOrEqual(400);
  });

  test('a revoked token stops working', async () => {
    const { api } = await signedUpContext('revoketoken');
    const minted = await mintToken(api, ['profile:read'], 'to be revoked');
    test.skip(minted.status !== 201, `could not mint: ${JSON.stringify(minted.body)}`);
    const asToken = await tokenContext(minted.secret as string);
    expect((await asToken.get('/api/v1/users/me', { failOnStatusCode: false })).status()).toBe(200);

    const revoked = await api.delete(`/api/v1/tokens/${minted.id}`, {
      failOnStatusCode: false,
    });
    expect(revoked.status()).toBeLessThan(300);

    await expect
      .poll(
        async () => (await asToken.get('/api/v1/users/me', { failOnStatusCode: false })).status(),
        { timeout: 10_000 },
      )
      .toBeGreaterThanOrEqual(400);
  });

  test('a made-up token is refused', async () => {
    const asToken = await tokenContext('flama_pat_totally_made_up_secret');

    const response = await asToken.get('/api/v1/users/me', {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(401);
  });

  test('an anonymous caller cannot mint a token', async () => {
    const api = await newContext();

    const minted = await mintToken(api, ['profile:read']);

    expect(minted.status).toBe(401);
  });

  test("a user cannot list another user's tokens", async () => {
    const { api: victim } = await signedUpContext('tokenvictim');
    await mintToken(victim, ['profile:read'], 'victim token');
    const { api: attacker } = await signedUpContext('tokenattacker');

    const response = await attacker.get('/api/v1/tokens', {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const rows = Array.isArray(body) ? body : (body.data ?? []);
    expect(
      rows.some((row: { name?: string }) => row.name === 'victim token'),
      "the ApiToken permission is scoped to the owner, so another user's tokens must not appear",
    ).toBe(false);
  });
});

test.describe('API token scope ceiling', () => {
  // Consequence of the unconditional `update User` grant on the default role:
  // the scope check correctly concludes the caller *may* delegate `users:write`,
  // so the resulting token can promote anyone to admin. Fixing the role fixes
  // this too — remove the annotation when it does.
  test.fail(
    true,
    "BUG #68: the default role's unconditional `update User` makes " +
      '`users:write` a grantable scope, so a plain user can mint a token that ' +
      'promotes anyone to admin.',
  );
  test('a token cannot exceed the scopes its owner is allowed to grant', async () => {
    const { api } = await signedUpContext('overscope');

    const minted = await mintToken(api, ['users:write'], 'over-scoped');

    expect(
      minted.status,
      'a plain user must not be able to mint a token that administers other users',
    ).toBe(403);
  });
});
