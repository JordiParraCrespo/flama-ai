/**
 * The organizations a user belongs to. Asked when a credential is narrowed to
 * organizations, so it can only be narrowed to ones its owner is in; answered
 * by the organizations module, and unbound without it.
 */
export interface OrganizationMembershipPort {
  findOrganizationIdsForUser(userId: string): Promise<string[]>;
}
