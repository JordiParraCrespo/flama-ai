import { describe, expect, it, vi } from 'vitest';
import type { IAuthClient } from '../auth.client';
import { AuthRepository } from '../auth.repository';

function client(overrides: Partial<IAuthClient> = {}): IAuthClient {
  return {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInSocial: vi.fn(),
    signOut: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    getSession: vi.fn(),
    getAuthHeaders: vi.fn(),
    ...overrides,
  };
}

describe('AuthRepository.respondToConsent', () => {
  it('passes the answer to the platform client and returns its redirect', async () => {
    const respondToConsent = vi.fn().mockResolvedValue('https://client.example/cb?code=1');
    const repository = new AuthRepository(client({ respondToConsent }));

    await expect(repository.respondToConsent({ consentCode: 'c1', accept: true })).resolves.toBe(
      'https://client.example/cb?code=1',
    );
    expect(respondToConsent).toHaveBeenCalledWith({ consentCode: 'c1', accept: true });
  });

  it('refuses on a platform that does not host the consent page', () => {
    const repository = new AuthRepository(client());

    expect(() => repository.respondToConsent({ consentCode: 'c1', accept: false })).toThrow(
      /consent page/,
    );
  });
});
