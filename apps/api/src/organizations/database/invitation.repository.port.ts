import type { Option } from 'oxide.ts';
import type { Invitation } from '../domain/invitation.types';

/**
 * Reads Better Auth's `invitation` table. Invitations are issued and answered
 * through Better Auth's API, which owns the table; the one write here undoes an
 * answer Better Auth has no way to take back.
 */
export interface InvitationRepositoryPort {
  findOneById(invitationId: string): Promise<Option<Invitation>>;

  /**
   * Put an accepted invitation back to `pending`, so it can be accepted again.
   * For an acceptance whose membership was left again because its role could
   * not be granted: Better Auth only accepts a pending invitation, and without
   * this a passing failure would use the invitation up.
   */
  reopen(invitationId: string): Promise<void>;
}
