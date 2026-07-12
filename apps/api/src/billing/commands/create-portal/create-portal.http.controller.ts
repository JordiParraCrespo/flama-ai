import { Body, Controller, Post, UseGuards, Version } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { BillingSessionResponseDto } from '../../dtos/billing-session.response.dto';
import { CreatePortalCommand } from './create-portal.command';
import { CreatePortalRequest } from './create-portal.request.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('billing')
export class CreatePortalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('portal')
  @Version('1')
  @ApiOperation({ summary: 'Open a Stripe Customer Portal session' })
  @ApiResponse({ status: 201, type: BillingSessionResponseDto })
  @ApiResponse({
    status: 404,
    description: 'BILLING_002: No billing customer exists for this user',
  })
  async portal(
    @CurrentUser('id') userId: string,
    @Body() body: CreatePortalRequest,
  ): Promise<BillingSessionResponseDto> {
    const url = await this.commandBus.execute<CreatePortalCommand, string>(
      new CreatePortalCommand({ userId, returnUrl: body.returnUrl }),
    );
    return { url };
  }
}
