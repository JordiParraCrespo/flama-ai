import type { IAuthClient } from "@flama/frontend";
import type { Role } from "@flama/shared";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Better Auth browser client. Authentication is cookie-based: the API sets an
 * httpOnly session cookie which the browser sends automatically on subsequent
 * requests (`credentials: include`). The Vite dev server proxies `/api` to the
 * API, keeping web and API same-origin so the cookie is sent without
 * cross-site restrictions.
 */
const apiBaseUrl = import.meta.env.VITE_API_URL ?? "";

export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl}/api/auth`,
  plugins: [
    inferAdditionalFields({
      user: {
        firstName: { type: "string", required: true },
        lastName: { type: "string", required: true },
        // Server-managed fields: never part of sign-up input.
        role: { type: "string", required: false, input: false },
        isActive: { type: "boolean", required: false, input: false },
      },
    }),
  ],
});

function unwrap(result: { error?: { message?: string } | null }): void {
  if (result.error) {
    throw new Error(result.error.message ?? "Authentication request failed");
  }
}

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
      callbackURL: "/dashboard",
      errorCallbackURL: "/login",
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
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        role: (user.role as Role) ?? "user",
        emailVerified: user.emailVerified,
      },
    };
  },

  // On web the browser sends the session cookie automatically.
  async getAuthHeaders() {
    return {};
  },
};
