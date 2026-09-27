import { banUserBodySchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class BanUserRequest extends createZodDto(banUserBodySchema) {}
