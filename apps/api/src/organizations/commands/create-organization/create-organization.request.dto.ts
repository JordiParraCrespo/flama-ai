import { createOrganizationSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateOrganizationRequest extends createZodDto(createOrganizationSchema) {}
