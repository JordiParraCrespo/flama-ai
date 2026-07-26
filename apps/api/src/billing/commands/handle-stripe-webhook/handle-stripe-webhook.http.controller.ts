import {
  Controller,
  Headers,
  HttpCode,
  Post,
  type RawBodyRequest,
  Req,
  Version,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { HandleStripeWebhookCommand } from './handle-stripe-webhook.command';

/**
 * Stripe webhook receiver. Public (Stripe cannot send a bearer token) and
 * unthrottled; authenticity is proven by the signature verified downstream.
 * Reads `req.rawBody` (populated by Better Auth's raw-body parser) so the exact
 * bytes Stripe signed are available for verification.
 */
@Controller('billing')
export class HandleStripeWebhookHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('webhook')
  @Version('1')
  @HttpCode(200)
  @SkipThrottle()
  @ApiExcludeEndpoint()
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const payload = request.rawBody ?? Buffer.from('');
    await this.commandBus.execute<HandleStripeWebhookCommand, void>(
      new HandleStripeWebhookCommand({ payload, signature: signature ?? '' }),
    );
    return { received: true };
  }
}
