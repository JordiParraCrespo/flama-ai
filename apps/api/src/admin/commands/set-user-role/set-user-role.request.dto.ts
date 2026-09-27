import { setUserRoleBodySchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class SetUserRoleRequest extends createZodDto(setUserRoleBodySchema) {}
