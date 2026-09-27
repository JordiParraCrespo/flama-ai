import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Query strings arrive as text, so the page bounds are coerced. */
export const listUsersSchema = z.object({
  searchValue: z.string().optional(),
  searchField: z.enum(['email', 'name']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});

export class ListUsersRequest extends createZodDto(listUsersSchema) {}
