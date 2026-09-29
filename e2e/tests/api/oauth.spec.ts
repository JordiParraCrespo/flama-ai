import { expect, test } from '@playwright/test';
import { newContext } from '../../support/auth';

/**
 * Google and GitHub sign-in, as `GET /health/capabilities` reports them. A
 * missing key disables a provider rather than breaking the app, and the
 * capability read is how a client finds out — so both halves are asserted
 * here.
 */
test.describe('the social sign-in providers', () => {
  test('capabilities reports which of them this deployment has', async () => {
    const api = await newContext();

    const response = await api.get('/api/v1/health/capabilities', {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('google_oauth');
    expect(body).toHaveProperty('github_oauth');
    expect(typeof body.google_oauth).toBe('boolean');
  });

  test('an unconfigured provider fails cleanly instead of crashing', async () => {
    const api = await newContext();
    const capabilities = await (
      await api.get('/api/v1/health/capabilities', { failOnStatusCode: false })
    ).json();
    test.skip(capabilities.google_oauth === true, 'Google is configured on this deployment');

    const response = await api.post('/api/auth/sign-in/social', {
      data: { provider: 'google', callbackURL: '/dashboard' },
      failOnStatusCode: false,
    });

    expect(response.status(), 'a disabled provider is "not found", not a 500').toBe(404);
    expect((await response.json()).code).toBe('PROVIDER_NOT_FOUND');
  });
});
