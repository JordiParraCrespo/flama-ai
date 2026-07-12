import { Module } from '@nestjs/common';
import { InvitationsController, OrganizationInvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { MembersController } from './members.controller';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

/**
 * First-class REST modules for organizations, members, invitations and
 * workspaces. These are **delegating façades** over the Better Auth organization
 * plugin's server API (`auth.api.*`) — Better Auth owns the tables and the
 * write logic; this module adds a typed, Swagger-documented, CASL-guarded
 * surface (so the operations appear in the generated `@flama/api-client`). No
 * TypeORM repositories here: the org tables are registered in `AuthModule`.
 */
@Module({
  controllers: [
    OrganizationsController,
    MembersController,
    OrganizationInvitationsController,
    InvitationsController,
    WorkspacesController,
  ],
  providers: [OrganizationsService, InvitationsService, WorkspacesService],
})
export class OrganizationsModule {}
