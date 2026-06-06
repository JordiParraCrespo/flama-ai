export abstract class EmailService {
  /** @param url Fully-built password reset link the recipient should open. */
  abstract sendPasswordReset(to: string, url: string): Promise<void>;
  /** @param url Fully-built email verification link the recipient should open. */
  abstract sendEmailVerification(to: string, url: string): Promise<void>;
  abstract sendWelcome(to: string, name: string): Promise<void>;
}
