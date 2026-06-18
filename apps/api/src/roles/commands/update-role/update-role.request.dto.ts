import { updateRoleSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateRoleRequest extends createZodDto(updateRoleSchema) {}
