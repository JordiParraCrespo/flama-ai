import { createPortalSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class CreatePortalRequest extends createZodDto(createPortalSchema) {}
