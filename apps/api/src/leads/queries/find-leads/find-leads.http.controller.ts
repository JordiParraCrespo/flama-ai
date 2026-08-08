import type { AccessScope } from '@flama/backend-authz';
import type { AppAbility } from '@flama/shared';
import { Controller, Get, Inject, Req, UseGuards, UseInterceptors, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { CurrentAccessScope } from '../../../authz/decorators/current-access-scope.decorator';
import { AccessScopeInterceptor } from '../../../authz/interceptors/access-scope.interceptor';
import type { LeadRepositoryPort } from '../../database/lead.repository.port';
import { LeadResponseDto } from '../../dtos/lead.response.dto';
import { LEAD_REPOSITORY } from '../../leads.di-tokens';
import { LeadMapper } from '../../leads.mapper';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@UseInterceptors(AccessScopeInterceptor)
@Controller('leads')
export class FindLeadsHttpController {
  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leads: LeadRepositoryPort,
    private readonly mapper: LeadMapper,
  ) {}

  /**
   * The whole authorization story for this route is the two decorators plus
   * handing the scope to the repository. There is no tenant filter here, and
   * there is no way to forget one: the repository throws without a scope.
   */
  @Get()
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Lead' })
  @RequireScopes('leads:read')
  @ApiOperation({ summary: 'List the leads the caller can reach' })
  @ApiResponse({ status: 200, type: [LeadResponseDto] })
  async list(
    @CurrentAccessScope() scope: AccessScope,
    @Req() request: { ability?: AppAbility },
  ): Promise<LeadResponseDto[]> {
    const records = await this.leads.findAll(scope);
    return records.map((record) => this.mapper.toResponse(record, request.ability));
  }
}
