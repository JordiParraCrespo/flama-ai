import { sharedClientPlugins, toAuthSession, unwrap } from '@flama/auth/client';
import type { IAuthClient } from '@flama/frontend';
import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth browser client. Authentication is cookie-based: the API sets an
 * httpOnly session cookie which the browser sends automatically on subsequent
 * requests (`credentials: include`). The Vite dev server proxies `/api` to the
 * API, keeping web and API same-origin so the cookie is sent without
 * cross-site restrictions.
 */
const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

/**
 * Better Auth rejects a relative `baseURL`, but same-origin is this app's
 * intended default — with no `VITE_API_URL` the path is just `/api/auth`,
 * which threw `Invalid base URL` and left the page blank before any UI
 * mounted. Resolving against the current origin keeps the zero-config path
 * working and still lets an absolute `VITE_API_URL` win, since `new URL()`
 * ignores the base when the input is already absolute.
 */
const authBaseUrl = new URL(`${apiBaseUrl}/api/auth`, window.location.origin).toString();

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  // The shared plugin set (additional user fields, admin, organizations) comes
  // from @flama/auth so the client types stay in lockstep with the server.
  plugins: [...sharedClientPlugins()],
});

export const webAuthClient: IAuthClient = {
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
    // Redirects the browser to the provider and back to /dashboard.
    await authClient.signIn.social({
      provider,
      callbackURL: '/dashboard',
      errorCallbackURL: '/login',
    });
  },

  async signOut() {
    await authClient.signOut();
  },

  async forgotPassword(email) {
    unwrap(
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
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
    return toAuthSession(await authClient.getSession());
  },

  // On web the browser sends the session cookie automatically.
  async getAuthHeaders() {
    return {};
  },
};
