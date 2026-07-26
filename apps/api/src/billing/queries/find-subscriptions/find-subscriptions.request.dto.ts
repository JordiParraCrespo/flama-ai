import { paginationSchema } from '@flama/backend-core';
import { SUBSCRIPTION_STATUSES } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const findSubscriptionsSchema = paginationSchema.extend({
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
});

export class FindSubscriptionsRequest extends createZodDto(findSubscriptionsSchema) {}
