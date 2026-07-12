/** Data needed to render/send an organization invitation email. */
export interface InvitationEmailParams {
  /** Name of the organization the recipient is invited to join. */
  organizationName: string;
  /** Display name of the member who sent the invitation. */
  inviterName: string;
  /** Organization role the recipient will be granted (e.g. `member`, `admin`). */
  role: string;
  /** Fully-built accept-invitation link the recipient should open. */
  url: string;
}

export abstract class EmailService {
  /** @param url Fully-built password reset link the recipient should open. */
  abstract sendPasswordReset(to: string, url: string): Promise<void>;
  /** @param url Fully-built email verification link the recipient should open. */
  abstract sendEmailVerification(to: string, url: string): Promise<void>;
  abstract sendWelcome(to: string, name: string): Promise<void>;
  /** Invite the recipient to join an organization. */
  abstract sendInvitation(to: string, params: InvitationEmailParams): Promise<void>;
}
