import { adminUpdateUserSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class AdminUpdateUserRequest extends createZodDto(adminUpdateUserSchema) {}
