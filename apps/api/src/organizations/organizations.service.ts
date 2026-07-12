import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { AddMemberDto, CreateOrganizationDto, UpdateOrganizationDto } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { APIError } from 'better-auth/api';
import { auth } from '../auth/auth';
import { betterAuthHeaders, invokeBetterAuth, unwrap, unwrapArray } from '../auth/better-auth.util';
import type {
  FullOrganizationResponseDto,
  MemberResponseDto,
  OrganizationResponseDto,
  SlugAvailabilityResponseDto,
} from './dtos/organization.response.dto';
import {
  mapFullOrganization,
  mapMember,
  mapMembers,
  mapOrganization,
  mapOrganizations,
} from './organization.mappers';

/**
 * Delegating façade over the Better Auth organization plugin's server API
 * (`auth.api.*`). Better Auth remains the single source of truth for the
 * organization / member tables and enforces its own owner/admin/member rules;
 * this service adds a typed, Swagger-documented, CASL-guarded REST surface.
 * Response normalization lives in `organization.mappers.ts`.
 */
@Injectable()
export class OrganizationsService {
  private headers(headers: IncomingHttpHeaders): Headers {
    return betterAuthHeaders(headers);
  }

  private slugify(base: string): string {
    const cleaned = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    return `${cleaned || 'org'}-${randomUUID().slice(0, 8)}`;
  }

  // --- Organizations ---

  async create(
    headers: IncomingHttpHeaders,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.createOrganization({
        body: {
          name: dto.name,
          slug: dto.slug ?? this.slugify(dto.name),
          logo: dto.logo,
        },
        headers: this.headers(headers),
      }),
    );
    return mapOrganization(result);
  }

  async update(
    headers: IncomingHttpHeaders,
    organizationId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.updateOrganization({
        body: { data: dto, organizationId },
        headers: this.headers(headers),
      }),
    );
    return mapOrganization(result);
  }

  async delete(
    headers: IncomingHttpHeaders,
    organizationId: string,
  ): Promise<OrganizationResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.deleteOrganization({
        body: { organizationId },
        headers: this.headers(headers),
      }),
    );
    return mapOrganization(result);
  }

  async setActive(
    headers: IncomingHttpHeaders,
    organizationId: string,
  ): Promise<OrganizationResponseDto | null> {
    const result = await invokeBetterAuth(() =>
      auth.api.setActiveOrganization({
        body: { organizationId },
        headers: this.headers(headers),
      }),
    );
    return result ? mapOrganization(result) : null;
  }

  async list(headers: IncomingHttpHeaders): Promise<OrganizationResponseDto[]> {
    const result = await invokeBetterAuth(() =>
      auth.api.listOrganizations({ headers: this.headers(headers) }),
    );
    return mapOrganizations(result);
  }

  async getFull(
    headers: IncomingHttpHeaders,
    organizationId: string,
  ): Promise<FullOrganizationResponseDto | null> {
    const result = await invokeBetterAuth(() =>
      auth.api.getFullOrganization({
        query: { organizationId },
        headers: this.headers(headers),
      }),
    );
    return result ? mapFullOrganization(result) : null;
  }

  /** Slug availability — Better Auth throws when a slug is taken; translate that to a boolean. */
  async checkSlug(
    headers: IncomingHttpHeaders,
    slug: string,
  ): Promise<SlugAvailabilityResponseDto> {
    try {
      await auth.api.checkOrganizationSlug({
        body: { slug },
        headers: this.headers(headers),
      });
      return { available: true };
    } catch (err) {
      if (err instanceof APIError) return { available: false };
      throw err;
    }
  }

  // --- Members ---

  async listMembers(
    headers: IncomingHttpHeaders,
    organizationId: string,
  ): Promise<MemberResponseDto[]> {
    const result = await invokeBetterAuth(() =>
      auth.api.listMembers({
        query: { organizationId },
        headers: this.headers(headers),
      }),
    );
    return mapMembers(unwrapArray(result, 'members'));
  }

  async addMember(
    headers: IncomingHttpHeaders,
    organizationId: string,
    dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.addMember({
        body: {
          userId: dto.userId,
          role: dto.role,
          organizationId,
          teamId: dto.teamId,
        },
        headers: this.headers(headers),
      }),
    );
    return mapMember(result);
  }

  async removeMember(
    headers: IncomingHttpHeaders,
    organizationId: string,
    memberIdOrEmail: string,
  ): Promise<MemberResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.removeMember({
        body: { memberIdOrEmail, organizationId },
        headers: this.headers(headers),
      }),
    );
    return mapMember(unwrap(result, 'member'));
  }

  async updateMemberRole(
    headers: IncomingHttpHeaders,
    organizationId: string,
    memberId: string,
    role: string,
  ): Promise<MemberResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.updateMemberRole({
        body: { memberId, role, organizationId },
        headers: this.headers(headers),
      }),
    );
    return mapMember(result);
  }

  async leave(headers: IncomingHttpHeaders, organizationId: string): Promise<MemberResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.leaveOrganization({
        body: { organizationId },
        headers: this.headers(headers),
      }),
    );
    return mapMember(result);
  }

  async getActiveMember(headers: IncomingHttpHeaders): Promise<MemberResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.getActiveMember({ headers: this.headers(headers) }),
    );
    return mapMember(result);
  }
}
