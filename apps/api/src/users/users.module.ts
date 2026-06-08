import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeleteUserService } from './services/delete-user.service';
import { UpdateUserService } from './services/update-user.service';
import { UsersService } from './services/users.service';
import { User } from './user.entity';
import { UserMapper } from './user.mapper';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UpdateUserService, DeleteUserService, UserMapper],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
