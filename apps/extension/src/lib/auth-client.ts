import { sharedClientPlugins, toAuthSession, unwrap } from '@flama/auth/client';
import type { IAuthClient } from '@flama/frontend-core';
import { TwoFactorRequiredError } from '@flama/frontend-core/react';
import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth from an extension page.
 *
 * The session is the API's ordinary httpOnly cookie, the one the web app
 * uses. An extension page is not same-site with the API, but Chrome treats a
 * request to a host in the manifest's `host_permissions` as same-site, so the
 * cookie is set and sent like a first-party one — no token in
 * `chrome.storage`, nothing for a compromised page to read. The API admits the
 * extension's origin (`chrome-extension://<id>`) through `EXTENSION_IDS` in
 * its trusted origins.
 *
 * Every extension page shares the browser's cookie jar, so a sign-in in the
 * popup is a sign-in in the side panel and the options page; `session/changed`
 * tells the open ones to look again.
 */
export const apiBaseUrl = import.meta.env.EXTENSION_PUBLIC_API_URL || 'http://localhost:3001';

/** The web app, where the flows an extension has no screen for live: sign-up, password reset. */
export const webAppUrl = import.meta.env.EXTENSION_PUBLIC_WEB_URL || 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl}/api/auth`,
  // The shared plugin set (additional user fields, admin, two-factor,
  // organizations) comes from @flama/auth so the client types stay in
  // lockstep with the server.
  plugins: [...sharedClientPlugins()],
});

export const extensionAuthClient: IAuthClient = {
  async signIn(email, password) {
    const result = await authClient.signIn.email({ email, password });
    unwrap(result);
    // The password was right, but the account has two-factor on: the API set
    // a short-lived challenge cookie instead of a session.
    if (result.data && 'twoFactorRedirect' in result.data) throw new TwoFactorRequiredError();
  },

  async verifyTwoFactor({ code, method, trustDevice }) {
    const verify =
      method === 'totp' ? authClient.twoFactor.verifyTotp : authClient.twoFactor.verifyBackupCode;
    unwrap(await verify({ code, trustDevice }));
  },

  async enableTwoFactor(password) {
    const result = await authClient.twoFactor.enable({ password });
    unwrap(result);
    return { totpURI: result.data?.totpURI ?? '', backupCodes: result.data?.backupCodes ?? [] };
  },

  async confirmTwoFactor(code) {
    unwrap(await authClient.twoFactor.verifyTotp({ code }));
  },

  async disableTwoFactor(password) {
    unwrap(await authClient.twoFactor.disable({ password }));
  },

  async generateBackupCodes(password) {
    const result = await authClient.twoFactor.generateBackupCodes({ password });
    unwrap(result);
    return result.data?.backupCodes ?? [];
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

  async signInSocial() {
    // A provider's redirect cannot come back into a popup that closed the
    // moment it lost focus; social sign-in from an extension is
    // `chrome.identity.launchWebAuthFlow`, and the README says how to add it.
    // No provider is offered (`socialProviders` in `flama.ts` is empty), so no
    // screen calls this.
    throw new Error('Social sign-in is not wired in the extension');
  },

  async signOut() {
    await authClient.signOut();
  },

  async forgotPassword(email) {
    // The reset link opens the web app, which has the screen to finish it.
    unwrap(
      await authClient.requestPasswordReset({ email, redirectTo: `${webAppUrl}/reset-password` }),
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

  // The browser sends the session cookie on every request to the API's host.
  async getAuthHeaders() {
    return {};
  },
};
