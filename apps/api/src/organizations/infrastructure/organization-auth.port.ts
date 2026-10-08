import type { IncomingHttpHeaders } from 'node:http';
import type { AddMemberDto, UpdateOrganizationDto } from '@flama/shared';
import type { Member } from '../domain/membership.types';
import type { FullOrganization, Organization } from '../domain/organization.types';

export interface NewOrganization {
  name: string;
  slug: string;
  logo?: string;
}

/** The Better Auth session a request carries, as far as these use cases read it. */
export interface CallerSession {
  userId: string;
  email: string;
  activeOrganizationId: string | null;
}

/**
 * What the organization and membership use cases need from the identity
 * provider, which owns the `organization` and `member` tables and enforces its
 * own owner/admin/member rules. Every method takes the incoming request's
 * headers, because the provider decides what the caller may do from them.
 *
 * The members these return carry only what the provider's rows hold; the
 * account behind each one is read from Postgres (`MemberRepositoryPort`).
 */
export interface OrganizationAuthPort {
  /**
   * The provider's session behind these headers; `null` for a delegated
   * credential the provider resolved without one.
   */
  session(headers: IncomingHttpHeaders): Promise<CallerSession | null>;

  create(headers: IncomingHttpHeaders, input: NewOrganization): Promise<Organization>;
  update(
    headers: IncomingHttpHeaders,
    organizationId: string,
    data: UpdateOrganizationDto,
  ): Promise<Organization>;
  delete(headers: IncomingHttpHeaders, organizationId: string): Promise<Organization>;
  /** Select the session's organization; `null` when the provider cleared it. */
  setActive(headers: IncomingHttpHeaders, organizationId: string): Promise<Organization | null>;
  /** The organizations the caller belongs to, in the provider's order. */
  list(headers: IncomingHttpHeaders): Promise<Organization[]>;
  /** With its members, invitations and teams; `null` when there is none. */
  getFull(headers: IncomingHttpHeaders, organizationId: string): Promise<FullOrganization | null>;
  isSlugAvailable(headers: IncomingHttpHeaders, slug: string): Promise<boolean>;

  listMembers(headers: IncomingHttpHeaders, organizationId: string): Promise<Member[]>;
  addMember(
    headers: IncomingHttpHeaders,
    organizationId: string,
    input: AddMemberDto,
  ): Promise<Member>;
  removeMember(
    headers: IncomingHttpHeaders,
    organizationId: string,
    memberIdOrEmail: string,
  ): Promise<Member>;
  updateMemberRole(
    headers: IncomingHttpHeaders,
    organizationId: string,
    memberId: string,
    role: string,
  ): Promise<Member>;
  /** The caller's own membership, ended; the provider refuses the last owner. */
  leave(headers: IncomingHttpHeaders, organizationId: string): Promise<Member>;
}
