import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { CheckPolicies } from '../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../auth/guards/policies.guard';
import { InviteMemberRequest } from './dtos/organization.request.dto';
import { InvitationResponseDto } from './dtos/organization.response.dto';
import { InvitationsService } from './invitations.service';

/** Organization-scoped invitation management (requires `Invitation` policies). */
@ApiTags('Organization invitations')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('organizations')
export class OrganizationInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post(':orgId/invitations')
  @Version('1')
  @CheckPolicies({ action: 'create', subject: 'Invitation' })
  @ApiOperation({ summary: 'Invite a member to an organization' })
  @ApiResponse({ status: 201, type: InvitationResponseDto })
  invite(
    @Req() req: Request,
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() body: InviteMemberRequest,
  ): Promise<InvitationResponseDto> {
    return this.invitations.invite(req.headers, orgId, body);
  }

  @Get(':orgId/invitations')
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Invitation' })
  @ApiOperation({ summary: 'List pending invitations for an organization' })
  @ApiResponse({ status: 200, type: [InvitationResponseDto] })
  list(
    @Req() req: Request,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<InvitationResponseDto[]> {
    return this.invitations.listForOrganization(req.headers, orgId);
  }
}

/**
 * Invitation actions addressed to the caller. These are self-service (any
 * authenticated user acting on their own invitation), so they carry no
 * `@CheckPolicies` — Better Auth verifies the invitation belongs to the caller.
 */
@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: "List the caller's pending invitations" })
  @ApiResponse({ status: 200, type: [InvitationResponseDto] })
  listMine(@Req() req: Request): Promise<InvitationResponseDto[]> {
    return this.invitations.listForCaller(req.headers);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get an invitation by id' })
  @ApiResponse({ status: 200, type: InvitationResponseDto })
  get(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string): Promise<InvitationResponseDto> {
    return this.invitations.get(req.headers, id);
  }

  @Post(':id/accept')
  @Version('1')
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiResponse({ status: 200, type: InvitationResponseDto })
  accept(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitationResponseDto> {
    return this.invitations.accept(req.headers, id);
  }

  @Post(':id/reject')
  @Version('1')
  @ApiOperation({ summary: 'Reject an invitation' })
  @ApiResponse({ status: 200, type: InvitationResponseDto })
  reject(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitationResponseDto> {
    return this.invitations.reject(req.headers, id);
  }

  @Post(':id/cancel')
  @Version('1')
  @CheckPolicies({ action: 'update', subject: 'Invitation' })
  @ApiOperation({ summary: 'Cancel an invitation (organization manager)' })
  @ApiResponse({ status: 200, type: InvitationResponseDto })
  cancel(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvitationResponseDto> {
    return this.invitations.cancel(req.headers, id);
  }
}
