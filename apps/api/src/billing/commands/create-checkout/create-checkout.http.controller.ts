import { Body, Controller, Post, UseGuards, Version } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RequireScopes } from '../../../auth/decorators/require-scopes.decorator';
import { BillingSessionResponseDto } from '../../dtos/billing-session.response.dto';
import { CreateCheckoutCommand } from './create-checkout.command';
import { CreateCheckoutRequest } from './create-checkout.request.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('billing')
export class CreateCheckoutHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('checkout')
  @Version('1')
  @RequireScopes('billing:write')
  @ApiOperation({
    summary: 'Create a Stripe Checkout session for a subscription',
  })
  @ApiResponse({ status: 201, type: BillingSessionResponseDto })
  @ApiResponse({
    status: 409,
    description: 'BILLING_006: This user already has an active subscription',
  })
  @ApiResponse({
    status: 503,
    description: 'BILLING_001: Billing is not configured',
  })
  async checkout(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
    @Body() body: CreateCheckoutRequest,
  ): Promise<BillingSessionResponseDto> {
    const url = await this.commandBus.execute<CreateCheckoutCommand, string>(
      new CreateCheckoutCommand({
        userId,
        email,
        priceId: body.priceId,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
      }),
    );
    return { url };
  }
}
