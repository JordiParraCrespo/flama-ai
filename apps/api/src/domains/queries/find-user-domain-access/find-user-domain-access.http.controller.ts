import { Controller, Get, Param, ParseUUIDPipe, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../../../auth/decorators/check-policies.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { ApiAuthGuard } from '../../../auth/guards/api-auth.guard';
import { PoliciesGuard } from '../../../auth/guards/policies.guard';
import { UserDomainAccessResponseDto } from '../../dtos/user-domain-access.response.dto';
import { FindUserDomainAccessQuery } from './find-user-domain-access.query';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(ApiAuthGuard, PoliciesGuard)
@Controller('users')
export class FindUserDomainAccessHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':userId/domains')
  @Version('1')
  @CheckPolicies({ action: 'read', subject: 'Domain' })
  @RequireScopes('domains:read')
  @ApiOperation({
    summary: 'Get a user’s domain access',
    description:
      'Returns the domains the user is restricted to. `unrestricted` is true when no restriction is recorded and their role applies workspace-wide.',
  })
  @ApiResponse({ status: 200, type: UserDomainAccessResponseDto })
  findOne(@Param('userId', ParseUUIDPipe) userId: string): Promise<UserDomainAccessResponseDto> {
    return this.queryBus.execute<FindUserDomainAccessQuery, UserDomainAccessResponseDto>(
      new FindUserDomainAccessQuery({ userId }),
    );
  }
}
