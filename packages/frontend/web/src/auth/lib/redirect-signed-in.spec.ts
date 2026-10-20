import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { loginHref, redirectSignedOut } from './redirect-signed-in';

/**
 * The sign-out bounce. What breaks if these fail: a reader opening a deep
 * link while signed out lands on the dashboard after signing in instead of
 * the page they asked for, or on a mangled path.
 */
describe('redirectSignedOut', () => {
  const thrown = (href: string) => {
    try {
      redirectSignedOut({ context: { auth: { isAuthenticated: false } }, location: { href } });
    } catch (error) {
      return (error as { options: { href?: string } }).options;
    }
    throw new Error('did not redirect');
  };

  it('sends a signed-out reader to /login carrying where they were going', () => {
    const target = '/settings?section=security&tab=2#keys';
    const { href } = thrown(target);
    const [path, query] = (href ?? '').split('?');

    expect(path).toBe('/login');
    expect(defaultParseSearch(`?${query}`)).toEqual({ redirect: target });
  });

  it('round-trips a target with spaces and characters that need escaping', () => {
    const target = '/profile?x=a b&y=ñ%';
    const query = loginHref(target).slice('/login'.length);
    expect(defaultParseSearch(query)).toEqual({ redirect: target });
  });

  it('lets a signed-in reader through', () => {
    expect(
      redirectSignedOut({ context: { auth: { isAuthenticated: true } }, location: { href: '/x' } }),
    ).toBeUndefined();
  });
});
