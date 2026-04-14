import { AppError } from '@flama/backend-core';
import type { TokenPair } from '@flama/shared';
import { AUTH } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { UserTokenService } from '../../users/services/user-token.service';
import { UsersService } from '../../users/services/users.service';
import { AuthErrors } from '../errors/auth.errors';
import { UserRegisteredEvent } from '../events/user-registered.event';

@Injectable()
export class RegisterService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userTokenService: UserTokenService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<TokenPair> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new AppError(AuthErrors.EMAIL_ALREADY_IN_USE);

    const hashedPassword = await bcrypt.hash(dto.password, AUTH.SALT_ROUNDS);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
      role: 'user',
    });

    const tokens = await this.userTokenService.generateAndStoreTokens(
      user.id,
      user.email,
      user.role,
    );

    this.eventEmitter.emit(
      UserRegisteredEvent.eventName,
      new UserRegisteredEvent(user.id, user.email, user.firstName),
    );

    return tokens;
  }
}
