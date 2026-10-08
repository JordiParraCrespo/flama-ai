import { updateMemberRoleSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateMemberRoleRequest extends createZodDto(updateMemberRoleSchema) {}
