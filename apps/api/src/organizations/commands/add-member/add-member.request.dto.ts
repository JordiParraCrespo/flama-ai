import { addMemberSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class AddMemberRequest extends createZodDto(addMemberSchema) {}
