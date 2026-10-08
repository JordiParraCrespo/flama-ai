import { listMembersSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class ListMembersRequest extends createZodDto(listMembersSchema) {}
