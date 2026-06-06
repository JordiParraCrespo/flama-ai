import type { Role } from "@flama/shared";

/**
 * Platform-agnostic authentication client contract.
 *
 * Each platform (web / mobile) builds a Better Auth client with the plugins it
 * needs (the Expo plugin + SecureStore on mobile, browser cookies on web) and
 * adapts it to this interface, which is then injected into the DI container.
 * Keeping the boundary here means the rest of the frontend package never
 * imports `better-auth` directly.
 */
export interface AuthSessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  emailVerified: boolean;
}

export interface AuthSession {
  user: AuthSessionUser;
}

export interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export type SocialProvider = "google" | "github";

export interface IAuthClient {
  /** Sign in with email and password. Rejects on failure. */
  signIn(email: string, password: string): Promise<void>;
  /** Create an account with email and password. Rejects on failure. */
  signUp(params: SignUpParams): Promise<void>;
  /**
   * Start the OAuth flow for a social provider. On web this redirects the
   * browser; on mobile it opens an auth session and deep-links back.
   */
  signInSocial(provider: SocialProvider): Promise<void>;
  /** Clear the current session. */
  signOut(): Promise<void>;
  /** Send a password reset email. */
  forgotPassword(email: string): Promise<void>;
  /** Complete a password reset using the token from the reset email. */
  resetPassword(token: string, newPassword: string): Promise<void>;
  /** Change the password for the currently authenticated user. */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  /** Return the current session, or `null` if not authenticated. */
  getSession(): Promise<AuthSession | null>;
  /**
   * Extra headers used to authenticate non-auth REST calls (the generated
   * `@flama/api-client`). On native this carries the Better Auth session
   * cookie from SecureStore; on web it is empty and the browser sends cookies.
   */
  getAuthHeaders(): Promise<Record<string, string>>;
}
