import { findFlagChangesSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class FindFlagChangesRequest extends createZodDto(findFlagChangesSchema) {}
