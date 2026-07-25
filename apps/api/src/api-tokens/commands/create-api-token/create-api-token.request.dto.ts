import { createApiTokenSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateApiTokenRequest extends createZodDto(createApiTokenSchema) {}
