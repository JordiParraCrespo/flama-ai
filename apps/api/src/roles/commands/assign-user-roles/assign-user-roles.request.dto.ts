import { assignUserRolesSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class AssignUserRolesRequest extends createZodDto(assignUserRolesSchema) {}
