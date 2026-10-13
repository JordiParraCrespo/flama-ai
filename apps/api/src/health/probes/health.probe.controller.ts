import { CapabilitiesService } from '@flama/backend-core';
import { CLIENT_CAPABILITIES, type ClientCapabilities } from '@flama/shared';
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { NoPolicy } from '../../auth/decorators/check-policies.decorator';
import { AllowAnyScope } from '../../auth/decorators/require-scopes.decorator';
import type { DeploymentCapability } from '../../capabilities/capabilities.module';
import { LivenessResponseDto, ReadinessResponseDto } from '../dtos/readiness.response.dto';
import { ReadinessIndicator } from './readiness.indicator';

/**
 * The probes. Public and unauthenticated on purpose: the container healthcheck
 * and the load balancer call them before anything could hold a credential, and
 * nothing they answer describes the deployment beyond "can it serve".
 */
@ApiTags('Health')
@Controller()
export class HealthProbeController {
  constructor(
    private readinessIndicator: ReadinessIndicator,
    private capabilities: CapabilitiesService<DeploymentCapability>,
  ) {}

  /**
   * Checks nothing but that the process answers HTTP, which is the one thing
   * a restart fixes. A dependency here would restart a good process because
   * PostgreSQL blinked; a heap threshold would restart a busy one at its
   * peak, mid-request, when V8 itself already ends a process that really
   * runs out. Both belong to `/ready` and to the metrics.
   */
  @Get('health')
  @NoPolicy('public liveness probe')
  @ApiOperation({
    summary: 'Liveness check',
    description:
      'Answers 200 while the process can serve HTTP. Says nothing about PostgreSQL, Redis or any other dependency: that is `/ready`.',
  })
  @ApiResponse({ status: 200, type: LivenessResponseDto, description: 'The process answered' })
  check(): LivenessResponseDto {
    return { status: 'ok' };
  }

  @Get('health/capabilities')
  @NoPolicy('public capability probe; already unauthenticated')
  // Anonymous callers already get this response (the login page reads it
  // before any session exists), so a scoped credential may too — without this
  // the global ScopesGuard fails closed and 403s API-token/OAuth callers.
  @AllowAnyScope()
  @ApiOperation({
    summary: 'Client-facing capabilities of this deployment',
  })
  @ApiResponse({
    status: 200,
    // A map, not a fixed shape: its keys are `CLIENT_CAPABILITIES`, which the
    // features a project has decide.
    schema: { type: 'object', additionalProperties: { type: 'boolean' } },
    description:
      'Each client-relevant optional feature (sign-in providers, integrations) by name, and whether this deployment has it configured. `false` means not configured, not unhealthy. Server-internal capabilities are not exposed here.',
  })
  deploymentCapabilities(): ClientCapabilities {
    // Only the client-facing subset goes over the wire; the full registry
    // stays in the startup log and in-process.
    return this.capabilities.pick(CLIENT_CAPABILITIES);
  }

  @Get('ready')
  @NoPolicy('public readiness probe')
  @ApiOperation({
    summary: 'Readiness check',
    description:
      'Answers 200 only when PostgreSQL and Redis both answer within their configured timeouts, and 503 otherwise. Why a dependency failed is logged, never returned.',
  })
  @ApiResponse({ status: 200, type: ReadinessResponseDto, description: 'This replica can serve' })
  @ApiResponse({
    status: 503,
    type: ReadinessResponseDto,
    description: 'A dependency is unavailable; this replica must not serve. Same body shape.',
  })
  async readiness(@Res({ passthrough: true }) response: Response): Promise<ReadinessResponseDto> {
    const result = await this.readinessIndicator.check();
    if (result.status !== 'ok') response.status(HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}
