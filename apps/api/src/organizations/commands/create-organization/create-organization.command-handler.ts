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

  async execute({ headers, input, creatorId }: CreateOrganizationCommand): Promise<AggregateID> {
    // An organization its creator cannot open would count as a workspace: the
    // next reload skips onboarding into a 403, and a retry leaves a second one
    // beside it. So if the role cannot be granted, the organization goes.
    const { organizationId } = await this.membershipAccess.admit(
      async () => {
        const organization = await this.organizations.create(headers, {
          name: input.name,
          slug: input.slug ?? deriveOrganizationSlug(input.name),
          logo: input.logo,
        });
        return { userId: creatorId, organizationId: organization.id, role: 'owner' };
      },
      (entry) => this.organizations.delete(headers, entry.organizationId),
    );
    await this.provisionDefaultWorkspace(headers, organizationId, creatorId);
    return organizationId;
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
