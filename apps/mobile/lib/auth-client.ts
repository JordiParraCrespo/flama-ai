import { expoClient } from '@better-auth/expo/client';
import type { IAuthClient } from '@flama/frontend';
import type { Role } from '@flama/shared';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// Must match the `scheme` in app.config.ts and MOBILE_SCHEME on the API so
// OAuth and password-reset deep links resolve back into the app.
const scheme = 'flama';

export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl}/api/auth`,
  plugins: [
    expoClient({
      scheme,
      storagePrefix: 'flama',
      storage: SecureStore,
    }),
    inferAdditionalFields({
      user: {
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        role: { type: 'string', required: false, input: false },
        isActive: { type: 'boolean', required: false, input: false },
      },
    }),
  ],
});

function unwrap(result: { error?: { message?: string } | null }): void {
  if (result.error) {
    throw new Error(result.error.message ?? 'Authentication request failed');
  }
}

export const mobileAuthClient: IAuthClient = {
  async signIn(email, password) {
    unwrap(await authClient.signIn.email({ email, password }));
  },

  async signUp({ email, password, firstName, lastName }) {
    unwrap(
      await authClient.signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
      }),
    );
  },

  async signInSocial(provider) {
    // Opens an in-app browser and deep-links back via the app scheme.
    unwrap(
      await authClient.signIn.social({
        provider,
        callbackURL: `${scheme}://`,
      }),
    );
  },

  async signOut() {
    await authClient.signOut();
  },

  async forgotPassword(email) {
    unwrap(
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${scheme}://reset-password`,
      }),
    );
  },

  async resetPassword(token, newPassword) {
    unwrap(await authClient.resetPassword({ token, newPassword }));
  },

  async changePassword(currentPassword, newPassword) {
    unwrap(await authClient.changePassword({ currentPassword, newPassword }));
  },

  async getSession() {
    const { data } = await authClient.getSession();
    if (!data) return null;
    const user = data.user as typeof data.user & {
      firstName?: string;
      lastName?: string;
      role?: string;
    };
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        role: (user.role as Role) ?? 'user',
        emailVerified: user.emailVerified,
      },
    };
  },

  // Attach the Better Auth session cookie (stored in SecureStore) to the
  // generated REST client's requests.
  async getAuthHeaders(): Promise<Record<string, string>> {
    const cookie = authClient.getCookie();
    return cookie ? { Cookie: cookie } : {};
  },
};
