export abstract class EmailService {
  abstract sendPasswordReset(to: string, token: string): Promise<void>;
  abstract sendEmailVerification(to: string, token: string): Promise<void>;
  abstract sendWelcome(to: string, name: string): Promise<void>;
}
