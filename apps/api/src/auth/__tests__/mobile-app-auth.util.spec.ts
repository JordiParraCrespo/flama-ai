import { betterAuth } from 'better-auth';
import { appSchemeOrigins } from '../infrastructure/mobile-app-auth.util';

/**
 * Whether Better Auth trusts the phone app's deep-link scheme. It is opt-in:
 * any Android app can register a custom scheme and be handed the redirect that
 * carries a session, so a deployment that never named one must not trust
 * `flama://`. The regression is a default scheme coming back, or a web scheme
 * slipping through as one.
 *
 * Asked of a real Better Auth instance built from the origins, so what is
 * checked is the origin check the sign-in and reset redirects go through.
 */
async function authWith(env: { MOBILE_SCHEME?: string }) {
  const auth = betterAuth({
    baseURL: 'http://localhost:3001',
    secret: 'a-test-secret-that-is-long-enough-0123456789',
    trustedOrigins: ['http://localhost:3000', ...appSchemeOrigins(env)],
    logger: { disabled: true },
  });
  const context = await auth.$context;
  return (url: string) => context.isTrustedOrigin(url);
}

describe('appSchemeOrigins', () => {
  it.each([{}, { MOBILE_SCHEME: undefined }, { MOBILE_SCHEME: '' }, { MOBILE_SCHEME: '  ' }])(
    'with %o trusts no app scheme',
    async (env) => {
      const trusts = await authWith(env);

      expect(trusts('flama://')).toBe(false);
      expect(trusts('flama://reset-password')).toBe(false);
      expect(trusts('http://localhost:3000')).toBe(true);
    },
  );

  it('trusts the scheme a deployment names, and only that one', async () => {
    const trusts = await authWith({ MOBILE_SCHEME: 'acme' });

    expect(trusts('acme://')).toBe(true);
    expect(trusts('flama://')).toBe(false);
  });

  it.each(['https', 'HTTP', 'javascript', 'not a scheme', '1app', 'acme://', ' acme'])(
    'refuses %j at boot, naming the variable, rather than trust it',
    (scheme) => {
      expect(() => appSchemeOrigins({ MOBILE_SCHEME: scheme })).toThrow(/^MOBILE_SCHEME /);
    },
  );
});
