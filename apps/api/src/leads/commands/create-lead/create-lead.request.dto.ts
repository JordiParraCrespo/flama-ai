import { createLeadSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateLeadRequest extends createZodDto(createLeadSchema) {}
