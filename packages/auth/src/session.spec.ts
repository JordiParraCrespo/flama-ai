import { describe, expect, it } from 'vitest';
import { toAuthSession } from './session';
import { unwrap } from './unwrap';

describe('unwrap', () => {
  it('does nothing on success', () => {
    expect(() => unwrap({ error: null })).not.toThrow();
    expect(() => unwrap({})).not.toThrow();
  });

  it('throws the error message on failure', () => {
    expect(() => unwrap({ error: { message: 'Invalid credentials' } })).toThrow(
      'Invalid credentials',
    );
  });

  it('falls back to a generic message when the error has none', () => {
    expect(() => unwrap({ error: {} })).toThrow('Authentication request failed');
  });
});

describe('toAuthSession', () => {
  const user = {
    id: 'u1',
    email: 'jane@example.com',
    emailVerified: true,
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'admin',
  };

  it('maps a session to the platform-agnostic shape', () => {
    expect(toAuthSession({ data: { user }, error: null })).toEqual({
      user: {
        id: 'u1',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'admin',
        emailVerified: true,
      },
    });
  });

  it('defaults the additional fields when absent', () => {
    const session = toAuthSession({
      data: {
        user: { id: 'u1', email: 'jane@example.com', emailVerified: false },
      },
      error: null,
    });
    expect(session?.user).toMatchObject({
      firstName: '',
      lastName: '',
      role: 'user',
    });
  });

  it('returns null when there is no session', () => {
    expect(toAuthSession({ data: null, error: null })).toBeNull();
  });

  it('surfaces transport failures instead of returning null', () => {
    expect(() => toAuthSession({ data: null, error: { message: 'Network down' } })).toThrow(
      'Network down',
    );
    expect(() => toAuthSession({ data: null, error: {} })).toThrow('Failed to restore session');
  });
});
