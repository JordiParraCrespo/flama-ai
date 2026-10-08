import type { IncomingHttpHeaders } from 'node:http';
import { AppError } from '@flama/backend-core';
import type { AddMemberDto, UpdateOrganizationDto } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { APIError } from 'better-auth/api';
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

/** Members read per call while paging through a roster; Better Auth's own default. */
const MEMBER_PAGE_SIZE = 100;
/** Pages read before a roster is taken to be endless: a hundred thousand members. */
const MAX_MEMBER_PAGES = 1000;
/** Better Auth's code for a slug some organization already has. */
const SLUG_TAKEN_CODE = 'ORGANIZATION_SLUG_ALREADY_TAKEN';

function upstreamCodeOf(error: APIError): unknown {
  return asRecord(asRecord(error).body).code;
}

/**
 * The organization port, over the Better Auth organization plugin's server API
 * (`auth.api.*`). Better Auth remains the single source of truth for the
 * organization and member tables; every call goes through
 * `invokeOrganizationApi`, so its failures arrive as this module's catalog.
 */
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
   * Better Auth answers a taken slug with `ORGANIZATION_SLUG_ALREADY_TAKEN`,
   * and that one code is the answer "no". It is read off Better Auth's own
   * error before the invoker folds it: the catalog entry it maps to also
   * covers other upstream codes. Any other failure stays the problem document
   * the invoker makes of it.
   */
  async isSlugAvailable(headers: IncomingHttpHeaders, slug: string): Promise<boolean> {
    return invokeOrganizationApi(async () => {
      try {
        await auth.api.checkOrganizationSlug({
          body: { slug },
          headers: betterAuthHeaders(headers),
        });
        return true;
      } catch (error) {
        if (error instanceof APIError && upstreamCodeOf(error) === SLUG_TAKEN_CODE) return false;
        throw error;
      }
    });
  }

  /**
   * The whole roster, a page at a time. Better Auth caps one answer at
   * `membershipLimit` (100 unless configured), so a single call would silently
   * drop every member past it; it still checks on each page that the caller is
   * a member, which is why the roster is read through it and not from Postgres.
   * A short page is the end. A roster that never ends is refused rather than
   * read forever.
   */
  async listMembers(headers: IncomingHttpHeaders, organizationId: string): Promise<Member[]> {
    const members: Member[] = [];
    for (let read = 0; read < MAX_MEMBER_PAGES; read++) {
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
      if (page.length < MEMBER_PAGE_SIZE) return members;
    }
    throw new AppError(OrganizationErrors.UPSTREAM_FAILED, {
      detail: `The member list did not end within ${MAX_MEMBER_PAGES * MEMBER_PAGE_SIZE} members`,
    });
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
