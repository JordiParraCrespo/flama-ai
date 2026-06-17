import { updateUserSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateUserRequest extends createZodDto(updateUserSchema) {}
