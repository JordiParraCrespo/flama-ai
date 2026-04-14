import { AppError } from '@flama/backend-core';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { UserErrors } from '../errors/user.errors';
import { UserDeletedEvent } from '../events/user-deleted.event';
import { User } from '../user.entity';

@Injectable()
export class DeleteUserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new AppError(UserErrors.NOT_FOUND);

    await this.usersRepository.remove(user);

    this.eventEmitter.emit(UserDeletedEvent.eventName, new UserDeletedEvent(id, user.email));
  }
}
