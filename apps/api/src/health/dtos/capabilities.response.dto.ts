import type { DeploymentCapabilities } from '@flama/shared';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Which optional features this deployment can actually serve, resolved from
 * config once at boot. `false` means "not configured on this install", not an
 * outage — a self-hoster curls this to see what their deployment can do.
 */
export class CapabilitiesResponseDto implements DeploymentCapabilities {
  @ApiProperty({ description: 'Sign-in with Google is configured.' })
  google_oauth!: boolean;

  @ApiProperty({ description: 'Sign-in with GitHub is configured.' })
  github_oauth!: boolean;

  @ApiProperty({ description: 'Stripe billing is configured.' })
  stripe_billing!: boolean;

  @ApiProperty({
    description: 'Files are stored in S3 (local disk otherwise).',
  })
  s3_storage!: boolean;

  @ApiProperty({
    description: 'A real email transport (SMTP or Resend) is configured, not the console fallback.',
  })
  email_delivery!: boolean;
}
