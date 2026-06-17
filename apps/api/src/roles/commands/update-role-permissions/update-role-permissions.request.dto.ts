import { updateRolePermissionsSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateRolePermissionsRequest extends createZodDto(updateRolePermissionsSchema) {}
