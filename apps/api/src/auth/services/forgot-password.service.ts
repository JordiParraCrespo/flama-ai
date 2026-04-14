import { randomBytes } from 'node:crypto';
import { QUEUE_NAMES } from '@flama/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class ForgotPasswordService {
  constructor(
    private readonly usersService: UsersService,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000);

    await this.usersService.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    await this.emailQueue.add('password-reset', { to: user.email, token });
  }
}
