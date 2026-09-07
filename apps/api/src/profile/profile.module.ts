import { Module, type Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../auth/entities/session.entity';
import { UsersModule } from '../users/user.module';
import { ChangePasswordHttpController } from './commands/change-password/change-password.http.controller';
import { ChangePasswordService } from './commands/change-password/change-password.service';
import { DeleteAvatarHttpController } from './commands/delete-avatar/delete-avatar.http.controller';
import { DeleteAvatarService } from './commands/delete-avatar/delete-avatar.service';
import { RevokeOtherSessionsHttpController } from './commands/revoke-other-sessions/revoke-other-sessions.http.controller';
import { RevokeOtherSessionsService } from './commands/revoke-other-sessions/revoke-other-sessions.service';
import { RevokeSessionHttpController } from './commands/revoke-session/revoke-session.http.controller';
import { RevokeSessionService } from './commands/revoke-session/revoke-session.service';
import { UpdateProfileHttpController } from './commands/update-profile/update-profile.http.controller';
import { UpdateProfileService } from './commands/update-profile/update-profile.service';
import { UploadAvatarHttpController } from './commands/upload-avatar/upload-avatar.http.controller';
import { UploadAvatarService } from './commands/upload-avatar/upload-avatar.service';
import { SessionRepository } from './database/session.repository';
import { SESSION_READER } from './profile.di-tokens';
import { ProfileMapper } from './profile.mapper';
import { FindSessionsHttpController } from './queries/find-sessions/find-sessions.http.controller';
import { FindSessionsQueryHandler } from './queries/find-sessions/find-sessions.query-handler';
import { GetProfileHttpController } from './queries/get-profile/get-profile.http.controller';
import { GetProfileQueryHandler } from './queries/get-profile/get-profile.query-handler';
import { AvatarStorage } from './services/avatar.storage';
import { ProfileAuthFacade } from './services/profile-auth.facade';

// Registration order matters: every static sub-route (`avatar`,
// `sessions`) must be matched before `sessions/:id`, and the bare `GET`/`PATCH`
// on the collection last.
const httpControllers = [
  UploadAvatarHttpController,
  DeleteAvatarHttpController,
  FindSessionsHttpController,
  RevokeOtherSessionsHttpController,
  RevokeSessionHttpController,
  ChangePasswordHttpController,
  GetProfileHttpController,
  UpdateProfileHttpController,
];

const commandHandlers: Provider[] = [
  UpdateProfileService,
  UploadAvatarService,
  DeleteAvatarService,
  ChangePasswordService,
  RevokeSessionService,
  RevokeOtherSessionsService,
];

const queryHandlers: Provider[] = [GetProfileQueryHandler, FindSessionsQueryHandler];

const repositories: Provider[] = [{ provide: SESSION_READER, useClass: SessionRepository }];

const services: Provider[] = [AvatarStorage, ProfileAuthFacade];

/**
 * The caller's own account: profile fields, avatar, password and sessions.
 *
 * Imports `UsersModule` for its `USER_REPOSITORY` — the `user` row is that
 * module's aggregate, and this module reads and updates the profile columns on
 * it through that port rather than mapping the same table twice.
 */
@Module({
  imports: [CqrsModule, UsersModule, TypeOrmModule.forFeature([Session])],
  controllers: [...httpControllers],
  providers: [...commandHandlers, ...queryHandlers, ...repositories, ...services, ProfileMapper],
})
export class ProfileModule {}
