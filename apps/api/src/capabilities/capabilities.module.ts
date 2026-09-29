import { CapabilitiesService } from '@flama/backend-core';
import { Global, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Every optional capability a deployment may have, and what turns it on — the
 * one list. Its names are the `DeploymentCapability` type, the startup log and
 * what `resolveCapabilities` returns; the client-facing subset is
 * `CLIENT_CAPABILITIES` in `@flama/shared`, which must name entries of this.
 *
 * A capability is on only when everything it needs is actually present — a
 * missing optional key removes a feature, it never throws (see
 * `.agents/rules/api-config.md`). Required settings (database,
 * `BETTER_AUTH_SECRET`) are the opposite and are not listed here: they fail
 * boot loudly in their config schemas.
 */
const CAPABILITIES = {
  // flama:begin oauth
  google_oauth: (config: ConfigService) =>
    Boolean(config.get('oauth.google.clientId') && config.get('oauth.google.clientSecret')),
  github_oauth: (config: ConfigService) =>
    Boolean(config.get('oauth.github.clientId') && config.get('oauth.github.clientSecret')),
  // flama:end oauth
  // flama:plugins capabilities
  // The `console` provider only prints to stdout — that is not delivery.
  email_delivery: (config: ConfigService) => {
    const provider = config.get<string>('email.provider');
    return (
      (provider === 'nodemailer' && Boolean(config.get('email.smtpHost'))) ||
      (provider === 'resend' && Boolean(config.get('email.resendApiKey')))
    );
  },
} satisfies Record<string, (config: ConfigService) => boolean>;

export type DeploymentCapability = keyof typeof CAPABILITIES;

/**
 * Which optional features this deployment can actually serve. `false` means
 * "not configured on this install", not an outage.
 */
export type DeploymentCapabilities = Record<DeploymentCapability, boolean>;

/** Resolves every capability in the table from config, once at boot. */
export function resolveCapabilities(configService: ConfigService): DeploymentCapabilities {
  return Object.fromEntries(
    Object.entries(CAPABILITIES).map(([name, resolve]) => [name, resolve(configService)]),
  ) as DeploymentCapabilities;
}

/**
 * Global so any module can ask "does this deployment have X?" through
 * `CapabilitiesService` instead of re-deriving it from raw config keys.
 */
@Global()
@Module({
  providers: [
    {
      provide: CapabilitiesService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new CapabilitiesService(resolveCapabilities(configService)),
    },
  ],
  exports: [CapabilitiesService],
})
export class CapabilitiesModule implements OnApplicationBootstrap {
  private readonly logger = new Logger('Capabilities');

  constructor(private readonly capabilities: CapabilitiesService) {}

  onApplicationBootstrap(): void {
    // One line, first thing after boot, answering "what can this deployment
    // do" — so a self-hoster learns a provider is off from the log, not from
    // a dead button or an opaque provider-side error.
    this.logger.log(`Deployment capabilities: ${this.capabilities.describe()}`);
  }
}
