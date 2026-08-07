import { updateDomainSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateDomainRequest extends createZodDto(updateDomainSchema) {}
