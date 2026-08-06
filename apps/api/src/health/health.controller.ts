import { CapabilitiesService } from '@flama/backend-core';
import type { DeploymentCapability } from '@flama/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { CapabilitiesResponseDto } from './dtos/capabilities.response.dto';
import { RedisHealthIndicator } from './redis-health.indicator';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private redis: RedisHealthIndicator,
    private capabilities: CapabilitiesService<DeploymentCapability>,
  ) {}

  @Get('health')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'App is alive' })
  check() {
    return this.health.check([() => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024)]);
  }

  @Get('health/capabilities')
  @ApiOperation({
    summary: 'Resolved optional capabilities of this deployment',
  })
  @ApiResponse({
    status: 200,
    type: CapabilitiesResponseDto,
    description:
      'Which optional features (OAuth providers, Stripe, S3, email delivery) this deployment has configured. `false` means not configured, not unhealthy.',
  })
  deploymentCapabilities(): CapabilitiesResponseDto {
    return this.capabilities.snapshot();
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'App is ready to receive traffic' })
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}
