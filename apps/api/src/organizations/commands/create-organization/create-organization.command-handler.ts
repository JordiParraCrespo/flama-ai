import type { IncomingHttpHeaders } from 'node:http';
import type { AggregateID } from '@flama/backend-ddd';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { MembershipAccessPolicy } from '../../application/membership-access.policy';
import { deriveOrganizationSlug } from '../../domain/organization-slug.policy';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import type { WorkspaceAuthPort } from '../../infrastructure/workspace-auth.port';
import { ORGANIZATION_AUTH, WORKSPACE_AUTH } from '../../organizations.di-tokens';
import { CreateOrganizationCommand } from './create-organization.command';

/** The workspace every new organization starts with, named as the sign-up hook once named it. */
const DEFAULT_WORKSPACE_NAME = 'General';

/**
 * Creates an organization the creator can actually open, and answers its id.
 *
 * Better Auth writes the organization and an `owner` membership; neither is
 * what the app's routes check. CASL is, and until the org-scoped application
 * role is written the creator owns an organization they cannot read — how a
 * self-service registration used to land on a dashboard that answered 403
 * (issue #106). The default workspace comes with it, so a fresh organization is
 * somewhere rows can be filed.
 */
@CommandHandler(CreateOrganizationCommand)
export class CreateOrganizationCommandHandler
  implements ICommandHandler<CreateOrganizationCommand, AggregateID>
{
  private readonly logger = new Logger(CreateOrganizationCommandHandler.name);

  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
    @Inject(WORKSPACE_AUTH)
    private readonly workspaces: WorkspaceAuthPort,
    private readonly membershipAccess: MembershipAccessPolicy,
  ) {}

  async execute({ headers, input }: CreateOrganizationCommand): Promise<AggregateID> {
    const organization = await this.organizations.create(headers, {
      name: input.name,
      slug: input.slug ?? deriveOrganizationSlug(input.name),
      logo: input.logo,
    });

    const session = await this.organizations.session(headers);
    // No session means a delegated credential Better Auth resolved on its own;
    // the membership is still correct, and the owner's roles are untouched.
    if (!session) return organization.id;

    try {
      await this.membershipAccess.grant(session.userId, organization.id, 'owner');
    } catch (error) {
      // Returning an organization its creator cannot open would have the app
      // count it as a workspace: the next reload skips onboarding into a 403,
      // and a retry leaves a second one beside it. Undo the write and fail.
      await this.discardUnopenableOrganization(headers, organization.id);
      throw error;
    }
    await this.provisionDefaultWorkspace(headers, organization.id, session.userId);

    return organization.id;
  }

  /**
   * Safe here and nowhere else: the organization is seconds old and its only
   * member is the caller. A failed delete is logged, not thrown — the caller
   * must see the original error, not one about the cleanup.
   */
  private async discardUnopenableOrganization(
    headers: IncomingHttpHeaders,
    organizationId: string,
  ): Promise<void> {
    try {
      await this.organizations.delete(headers, organizationId);
    } catch (error) {
      this.logger.error(
        {
          message: 'Could not discard an organization whose role assignment failed',
          organizationId,
        },
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Best-effort on purpose: failing the request here would tell the caller an
   * organization they own does not exist. A missing workspace is visible and
   * fixable from the UI.
   */
  private async provisionDefaultWorkspace(
    headers: IncomingHttpHeaders,
    organizationId: string,
    creatorId: string,
  ): Promise<void> {
    try {
      const workspace = await this.workspaces.create(headers, {
        name: DEFAULT_WORKSPACE_NAME,
        organizationId,
      });
      await this.workspaces.addMember(headers, workspace.id, creatorId);
      await this.workspaces.setActive(headers, workspace.id);
    } catch (error) {
      this.logger.warn({
        message: 'Could not provision the default workspace for a new organization',
        organizationId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
