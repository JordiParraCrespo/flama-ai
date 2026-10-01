import { paginationSchema } from '@flama/backend-core';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const findRolesSchema = paginationSchema.extend({
  // Bounded: the term is matched against every row.
  search: z.string().trim().max(100).optional(),
});

export class FindRolesRequest extends createZodDto(findRolesSchema) {}
