import { AuthzModule as AuthzKernelModule } from '@flama/backend-authz';
import { Global, Module, type Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SCOPED_CREDENTIAL } from '../auth/auth.di-tokens';
import { UsersModule } from '../users/user.module';
import { API_TOKEN_REPOSITORY } from './api-tokens.di-tokens';
import { ApiTokenMapper } from './api-tokens.mapper';
import { ApiTokenResource } from './api-tokens.resource';
import { ApiTokenCredentialResolver } from './application/api-token-credential.resolver';
import { ApiTokenRevokedDomainEventHandler } from './application/event-handlers/api-token-revoked.domain-event-handler';
import { CreateApiTokenCommandHandler } from './commands/create-api-token/create-api-token.command-handler';
import { CreateApiTokenHttpController } from './commands/create-api-token/create-api-token.http.controller';
import { RevokeApiTokenCommandHandler } from './commands/revoke-api-token/revoke-api-token.command-handler';
import { RevokeApiTokenHttpController } from './commands/revoke-api-token/revoke-api-token.http.controller';
import { ApiTokenOrmEntity } from './database/api-token.orm-entity';
import { ApiTokenRepository } from './database/api-token.repository';
import { FindApiTokenByIdQueryHandler } from './queries/find-api-token-by-id/find-api-token-by-id.query-handler';
import { FindApiTokensHttpController } from './queries/find-api-tokens/find-api-tokens.http.controller';
import { FindApiTokensQueryHandler } from './queries/find-api-tokens/find-api-tokens.query-handler';
import { FindCurrentCredentialHttpController } from './queries/find-current-credential/find-current-credential.http.controller';
import { FindCurrentCredentialQueryHandler } from './queries/find-current-credential/find-current-credential.query-handler';
import { FindGrantablePermissionsHttpController } from './queries/find-grantable-permissions/find-grantable-permissions.http.controller';
import { FindGrantablePermissionsQueryHandler } from './queries/find-grantable-permissions/find-grantable-permissions.query-handler';

// Registration order matters: `permissions` must be matched before `:id`.
const httpControllers = [
  FindCurrentCredentialHttpController,
  FindApiTokensHttpController,
  FindGrantablePermissionsHttpController,
  CreateApiTokenHttpController,
  RevokeApiTokenHttpController,
];

const commandHandlers: Provider[] = [CreateApiTokenCommandHandler, RevokeApiTokenCommandHandler];

const queryHandlers: Provider[] = [
  FindApiTokensQueryHandler,
  FindApiTokenByIdQueryHandler,
  FindGrantablePermissionsQueryHandler,
  FindCurrentCredentialQueryHandler,
];

const repositories: Provider[] = [{ provide: API_TOKEN_REPOSITORY, useClass: ApiTokenRepository }];

/**
 * API tokens module: the API's scoped credential, bound to the kernel's
 * `SCOPED_CREDENTIAL`, and the endpoints that mint and revoke one.
 *
 * Marked `@Global` because the auth layer's credential resolver — used by the
 * globally registered `ScopesGuard` — asks that binding, and that guard is
 * instantiated outside any feature module's injector.
 */
@Global()
@Module({
  imports: [
    CqrsModule,
    UsersModule,
    TypeOrmModule.forFeature([ApiTokenOrmEntity]),
    AuthzKernelModule.forFeature([ApiTokenResource]),
  ],
  controllers: [...httpControllers],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...repositories,
    ApiTokenMapper,
    ApiTokenRevokedDomainEventHandler,
    { provide: SCOPED_CREDENTIAL, useClass: ApiTokenCredentialResolver },
  ],
  exports: [SCOPED_CREDENTIAL],
})
export class ApiTokensModule {}
