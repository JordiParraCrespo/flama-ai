import type { AccessScope } from '@flama/backend-authz';
import { ApiProblemResponse } from '@flama/backend-core';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../auth/guards/policies.guard';
import { toAccessGrantResponse } from './authz.mapper';
import { CreateAccessGrantRequest } from './commands/create-access-grant/create-access-grant.request.dto';
import { CurrentAccessScope } from './decorators/current-access-scope.decorator';
import { AccessGrantResponseDto } from './dtos/access-grant.response.dto';
import { AccessScopeInterceptor } from './interceptors/access-scope.interceptor';
import { AccessGrantService } from './services/access-grant.service';

/**
 * Managing explicit access grants — the second scope dimension.
 *
 * Gated by `Role` policies rather than a subject of its own: handing someone
 * access to records is the same kind of privilege transfer as editing a role,
 * so it belongs behind the same permission.
 */
@ApiTags('Access grants')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@UseInterceptors(AccessScopeInterceptor)
@Controller('access-grants')
export class AccessGrantsController {
  constructor(private readonly grants: AccessGrantService) {}

  @Get()
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Role' })
  @RequireScopes('roles:read')
  @ApiOperation({
    summary: 'List the access grants in the active organization',
  })
  @ApiResponse({ status: 200, type: [AccessGrantResponseDto] })
  async list(@CurrentAccessScope() scope: AccessScope): Promise<AccessGrantResponseDto[]> {
    const grants = await this.grants.list(scope);
    return grants.map(toAccessGrantResponse);
  }

  @Post()
  @Version('1')
  @CheckPolicies({ action: 'update', subject: 'Role' })
  @RequireScopes('roles:write')
  @ApiOperation({
    summary: 'Grant access to specific records',
    description:
      'The grant may not exceed the granter’s own access. Omitting resourceId grants every resource of that type, which requires already holding all of them.',
  })
  @ApiResponse({ status: 201, type: AccessGrantResponseDto })
  @ApiProblemResponse({
    status: 403,
    description: "An access grant cannot exceed the granter's own access",
    code: 'GRANT_002',
  })
  @ApiProblemResponse({
    status: 400,
    description: 'The named principal does not belong to this organization',
    code: 'GRANT_003',
  })
  async create(
    @CurrentAccessScope() scope: AccessScope,
    @Body() body: CreateAccessGrantRequest,
  ): Promise<AccessGrantResponseDto> {
    const grant = await this.grants.create(scope, body);
    return toAccessGrantResponse(grant);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies({ action: 'update', subject: 'Role' })
  @RequireScopes('roles:write')
  @ApiOperation({ summary: 'Revoke an access grant' })
  @ApiResponse({ status: 204, description: 'Revoked' })
  @ApiProblemResponse({
    status: 404,
    description: 'Access grant not found',
    code: 'GRANT_001',
  })
  async revoke(
    @CurrentAccessScope() scope: AccessScope,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.grants.revoke(scope, id);
  }
}
