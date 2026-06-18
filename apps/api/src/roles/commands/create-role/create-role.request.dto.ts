import { createRoleSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateRoleRequest extends createZodDto(createRoleSchema) {}
