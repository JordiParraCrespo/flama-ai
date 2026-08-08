import { createAccessGrantSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateAccessGrantRequest extends createZodDto(createAccessGrantSchema) {}
