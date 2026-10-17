import type { Role } from '@flama/shared';

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

/**
 * What the caller means by starting an OAuth round-trip.
 *
 * The API refuses to mint an account from a bare sign-in
 * (`disableImplicitSignUp`), so a provider identity it has never seen is
 * rejected unless the caller asked for a sign-up. Both intents still *sign in*
 * an identity that already exists — including one that only exists as an
 * email/password account, which the API links on the way through. The intent
 * decides one thing: whether an unknown identity may become a new account.
 */
export type SocialAuthIntent = 'sign-in' | 'sign-up';

/**
 * What answers a two-factor sign-in challenge: a code from the authenticator
 * app, or one of the single-use backup codes handed out at enrolment.
 */
export type TwoFactorMethod = 'totp' | 'backup-code';

export interface VerifyTwoFactorParams {
  code: string;
  method: TwoFactorMethod;
  /**
   * Skip the code on this device for the next 30 days. The API keeps the
   * trust in a signed cookie it can revoke; turning two-factor off drops it.
   */
  trustDevice?: boolean;
}

/** What starting an enrolment hands back, shown to the user once. */
export interface TwoFactorEnrolment {
  /** The `otpauth://` URI an authenticator app scans or opens. */
  totpURI: string;
  /** Single-use codes that stand in for the app when it is lost. */
  backupCodes: string[];
}

export interface IAuthClient {
  /**
   * Sign in with email and password. Rejects on failure, and with a
   * `TwoFactorRequiredError` when the password was right but the account has
   * two-factor on: no session exists yet, and {@link verifyTwoFactor} with a
   * code completes the sign-in.
   */
  signIn(email: string, password: string): Promise<void>;
  /**
   * Answer the challenge a `TwoFactorRequiredError` announced, which creates
   * the session. Rejects on a wrong code; the challenge itself lasts ten
   * minutes and five attempts.
   */
  verifyTwoFactor(params: VerifyTwoFactorParams): Promise<void>;
  /**
   * Start enrolling an authenticator app. Two-factor is not on yet: it turns
   * on with {@link confirmTwoFactor}, so an enrolment abandoned here locks
   * nobody out. Starting again replaces the secret and the backup codes.
   */
  enableTwoFactor(password: string): Promise<TwoFactorEnrolment>;
  /** Confirm the enrolment with a first code from the app, turning two-factor on. */
  confirmTwoFactor(code: string): Promise<void>;
  /** Turn two-factor off and forget the trusted devices. */
  disableTwoFactor(password: string): Promise<void>;
  /** Replace the backup codes; the old ones stop working. */
  generateBackupCodes(password: string): Promise<string[]>;
  /** Create an account with email and password. Rejects on failure. */
  signUp(params: SignUpParams): Promise<void>;
  /**
   * Start the OAuth flow for a social provider, by the id Better Auth knows it
   * by. On web this redirects the
   * browser; on mobile it opens an auth session and deep-links back.
   *
   * `intent` defaults to `'sign-in'`, which the API refuses for an identity
   * that has no account here. Only the register screens pass `'sign-up'`.
   */
  signInSocial(provider: string, intent?: SocialAuthIntent): Promise<void>;
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
