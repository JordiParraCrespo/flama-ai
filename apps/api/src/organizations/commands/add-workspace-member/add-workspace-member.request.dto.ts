import { addWorkspaceMemberSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class AddWorkspaceMemberRequest extends createZodDto(addWorkspaceMemberSchema) {}
