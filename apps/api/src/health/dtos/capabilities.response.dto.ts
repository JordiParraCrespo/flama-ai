import type { ClientCapabilities } from '@flama/shared';
import { ApiProperty } from '@nestjs/swagger';

/**
 * A client capability's property: a required boolean, described by what `true`
 * says about the deployment. Each one a feature puts on the wire is declared
 * below with it.
 */
export function CapabilityProperty(description: string): PropertyDecorator {
  return ApiProperty({ type: Boolean, required: true, description });
}

/**
 * The client-facing capabilities of this deployment, resolved from config once
 * at boot. `false` means "not configured on this install", not an outage.
 *
 * Deliberately a subset of the full registry: only capabilities a client hides
 * or shows UI for belong on this public wire response. Server-internal ones
 * (`email_delivery`) stay in the startup log and the in-process
 * `CapabilitiesService`.
 */
export class CapabilitiesResponseDto implements ClientCapabilities {
  // flama:begin oauth
  @CapabilityProperty('Sign-in with Google is configured.')
  google_oauth!: boolean;

  @CapabilityProperty('Sign-in with GitHub is configured.')
  github_oauth!: boolean;
  // flama:end oauth
  // flama:plugins client-capabilities
}
