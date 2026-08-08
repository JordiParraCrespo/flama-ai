import type { AccessScope } from '@flama/backend-authz';
import { ApiProblemResponse, AppError } from '@flama/backend-core';
import type { AppAbility } from '@flama/shared';
import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { CurrentAccessScope } from '../../../authz/decorators/current-access-scope.decorator';
import { AccessScopeInterceptor } from '../../../authz/interceptors/access-scope.interceptor';
import type { LeadRepositoryPort } from '../../database/lead.repository.port';
import { LeadErrors } from '../../domain/lead.errors';
import { LeadResponseDto } from '../../dtos/lead.response.dto';
import { LEAD_REPOSITORY } from '../../leads.di-tokens';
import { LeadMapper } from '../../leads.mapper';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@UseInterceptors(AccessScopeInterceptor)
@Controller('leads')
export class FindLeadByIdHttpController {
  constructor(
    @Inject(LEAD_REPOSITORY)
    private readonly leads: LeadRepositoryPort,
    private readonly mapper: LeadMapper,
  ) {}

  /**
   * The detail route is where "the list filters but the detail doesn't" bugs
   * live. It cannot happen here: the same scoped query backs both, so a lead
   * outside the caller's scope is simply not found — and reports as 404 rather
   * than 403, so the id cannot be probed.
   */
  @Get(':id')
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Lead' })
  @RequireScopes('leads:read')
  @ApiOperation({ summary: 'Get one lead' })
  @ApiResponse({ status: 200, type: LeadResponseDto })
  @ApiProblemResponse({ status: 404, description: 'Lead not found', code: 'LEAD_001' })
  async get(
    @CurrentAccessScope() scope: AccessScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { ability?: AppAbility },
  ): Promise<LeadResponseDto> {
    const lead = await this.leads.findById(scope, id);
    if (lead.isNone()) {
      throw new AppError(LeadErrors.NOT_FOUND, { detail: `No lead with id ${id}` });
    }
    return this.mapper.toResponse(lead.unwrap(), request.ability);
  }
}
