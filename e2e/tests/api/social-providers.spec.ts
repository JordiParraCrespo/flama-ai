import { expect, test } from '@playwright/test';
import { newContext } from '../../support/auth';

/**
 * How the deployment behaves when the optional sign-in methods are switched
 * off. The rule the codebase states is that a missing key disables a feature
 * rather than breaking the app: a provider the API does not run is refused
 * cleanly, and signing in by password never depends on one.
 */
test.describe('optional auth providers', () => {
  test('an entirely unknown provider is refused', async () => {
    const api = await newContext();

    const response = await api.post('/api/auth/sign-in/social', {
      data: { provider: 'myspace', callbackURL: '/dashboard' },
      failOnStatusCode: false,
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('the API still authenticates by password with every provider off', async () => {
    const { signedUpContext } = await import('../../support/auth');
    const { api, user } = await signedUpContext('nooauth');

    const me = await api.get('/api/v1/users/me', { failOnStatusCode: false });

    expect(me.status()).toBe(200);
    expect((await me.json()).email).toBe(user.email);
  });
});
