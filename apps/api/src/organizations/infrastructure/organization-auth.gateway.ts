import type { IncomingHttpHeaders } from 'node:http';
import { AppError } from '@flama/backend-core';
import type { AddMemberDto, UpdateOrganizationDto } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { auth } from '../../auth/infrastructure/better-auth.config';
import {
  asRecord,
  betterAuthHeaders,
  unwrap,
  unwrapArray,
} from '../../auth/infrastructure/better-auth.util';
import type { Member } from '../domain/membership.types';
import { OrganizationErrors } from '../domain/organization.errors';
import type { FullOrganization, Organization } from '../domain/organization.types';
import { OrganizationMapper } from '../organization.mapper';
import type {
  CallerSession,
  NewOrganization,
  OrganizationAuthPort,
} from './organization-auth.port';
import { invokeOrganizationApi } from './organization-error.util';

/**
 * The organization port, over the Better Auth organization plugin's server API
 * (`auth.api.*`). Better Auth remains the single source of truth for the
 * organization and member tables; every call goes through
 * `invokeOrganizationApi`, so its failures arrive as this module's catalog.
 */
/** Members read per call while paging through a roster; Better Auth's own default. */
const MEMBER_PAGE_SIZE = 100;

@Injectable()
export class OrganizationAuthGateway implements OrganizationAuthPort {
  async session(headers: IncomingHttpHeaders): Promise<CallerSession | null> {
    const found = await auth.api.getSession({ headers: betterAuthHeaders(headers) });
    if (!found) return null;
    return {
      userId: found.user.id,
      email: found.user.email,
      activeOrganizationId: found.session.activeOrganizationId ?? null,
    };
  }

  async create(headers: IncomingHttpHeaders, input: NewOrganization): Promise<Organization> {
    const result = await invokeOrganizationApi(() =>
      auth.api.createOrganization({
        body: { name: input.name, slug: input.slug, logo: input.logo },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toOrganization(result);
  }

  async update(
    headers: IncomingHttpHeaders,
    organizationId: string,
    data: UpdateOrganizationDto,
  ): Promise<Organization> {
    const result = await invokeOrganizationApi(() =>
      auth.api.updateOrganization({
        body: { data, organizationId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toOrganization(result);
  }

  async delete(headers: IncomingHttpHeaders, organizationId: string): Promise<Organization> {
    const result = await invokeOrganizationApi(() =>
      auth.api.deleteOrganization({
        body: { organizationId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toOrganization(result);
  }

  async setActive(
    headers: IncomingHttpHeaders,
    organizationId: string,
  ): Promise<Organization | null> {
    const result = await invokeOrganizationApi(() =>
      auth.api.setActiveOrganization({
        body: { organizationId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return result ? OrganizationMapper.toOrganization(result) : null;
  }

  async list(headers: IncomingHttpHeaders): Promise<Organization[]> {
    const result = await invokeOrganizationApi(() =>
      auth.api.listOrganizations({ headers: betterAuthHeaders(headers) }),
    );
    return OrganizationMapper.toOrganizations(result);
  }

  async getFull(
    headers: IncomingHttpHeaders,
    organizationId: string,
  ): Promise<FullOrganization | null> {
    const result = await invokeOrganizationApi(() =>
      auth.api.getFullOrganization({
        query: { organizationId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return result ? OrganizationMapper.toFullOrganization(result) : null;
  }

  /**
   * Better Auth answers a taken slug with an error, and that one error is the
   * answer "no". Any other failure — the plugin refusing the request, a
   * failure upstream — stays the problem document the invoker makes of it.
   */
  async isSlugAvailable(headers: IncomingHttpHeaders, slug: string): Promise<boolean> {
    try {
      await invokeOrganizationApi(() =>
        auth.api.checkOrganizationSlug({
          body: { slug },
          headers: betterAuthHeaders(headers),
        }),
      );
      return true;
    } catch (error) {
      if (error instanceof AppError && error.code === OrganizationErrors.SLUG_TAKEN.code) {
        return false;
      }
      throw error;
    }
  }

  /**
   * The whole roster, a page at a time. Better Auth caps one answer at
   * `membershipLimit` (100 unless configured), so a single call would silently
   * drop every member past it; it still checks on each page that the caller is
   * a member, which is why the roster is read through it and not from Postgres.
   */
  async listMembers(headers: IncomingHttpHeaders, organizationId: string): Promise<Member[]> {
    const members: Member[] = [];
    for (;;) {
      const result = await invokeOrganizationApi(() =>
        auth.api.listMembers({
          query: {
            organizationId,
            limit: MEMBER_PAGE_SIZE,
            offset: members.length,
            sortBy: 'createdAt',
            sortDirection: 'asc',
          },
          headers: betterAuthHeaders(headers),
        }),
      );
      const page = OrganizationMapper.toMembers(unwrapArray(result, 'members'));
      members.push(...page);
      const total = Number(asRecord(result).total);
      if (page.length < MEMBER_PAGE_SIZE || members.length >= total) return members;
    }
  }

  async addMember(
    headers: IncomingHttpHeaders,
    organizationId: string,
    input: AddMemberDto,
  ): Promise<Member> {
    const result = await invokeOrganizationApi(() =>
      auth.api.addMember({
        body: {
          userId: input.userId,
          role: input.role,
          organizationId,
          teamId: input.teamId,
        },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toMember(result);
  }

  async removeMember(
    headers: IncomingHttpHeaders,
    organizationId: string,
    memberIdOrEmail: string,
  ): Promise<Member> {
    const result = await invokeOrganizationApi(() =>
      auth.api.removeMember({
        body: { memberIdOrEmail, organizationId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toMember(unwrap(result, 'member'));
  }

  async updateMemberRole(
    headers: IncomingHttpHeaders,
    organizationId: string,
    memberId: string,
    role: string,
  ): Promise<Member> {
    const result = await invokeOrganizationApi(() =>
      auth.api.updateMemberRole({
        body: { memberId, role, organizationId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toMember(result);
  }

  async leave(headers: IncomingHttpHeaders, organizationId: string): Promise<Member> {
    const result = await invokeOrganizationApi(() =>
      auth.api.leaveOrganization({
        body: { organizationId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toMember(result);
  }
}
