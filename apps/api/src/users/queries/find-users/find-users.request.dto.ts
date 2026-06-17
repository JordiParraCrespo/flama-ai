import { paginationSchema } from '@flama/backend-core';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const findUsersSchema = paginationSchema.extend({
  role: z.enum(['admin', 'user']).optional(),
  search: z.string().optional(),
});

export class FindUsersRequest extends createZodDto(findUsersSchema) {}
