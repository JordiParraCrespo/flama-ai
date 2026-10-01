import { paginationSchema } from '@flama/backend-core';
import { createZodDto } from 'nestjs-zod';

export class FindAccessGrantsRequest extends createZodDto(paginationSchema) {}
