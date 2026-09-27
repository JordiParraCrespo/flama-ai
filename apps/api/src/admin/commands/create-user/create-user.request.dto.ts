import { adminCreateUserSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class AdminCreateUserRequest extends createZodDto(adminCreateUserSchema) {}
