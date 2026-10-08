import type { IncomingHttpHeaders } from 'node:http';
import type { AddMemberDto, UpdateOrganizationDto } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { APIError } from 'better-auth/api';
import { auth } from '../../auth/infrastructure/better-auth.config';
import { betterAuthHeaders, unwrap, unwrapArray } from '../../auth/infrastructure/better-auth.util';
import type { Member } from '../domain/membership.types';
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

  /** Better Auth throws when a slug is taken; translate that to a boolean. */
  async isSlugAvailable(headers: IncomingHttpHeaders, slug: string): Promise<boolean> {
    try {
      await auth.api.checkOrganizationSlug({
        body: { slug },
        headers: betterAuthHeaders(headers),
      });
      return true;
    } catch (error) {
      if (error instanceof APIError) return false;
      throw error;
    }
  }

  async listMembers(headers: IncomingHttpHeaders, organizationId: string): Promise<Member[]> {
    const result = await invokeOrganizationApi(() =>
      auth.api.listMembers({
        query: { organizationId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toMembers(unwrapArray(result, 'members'));
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
