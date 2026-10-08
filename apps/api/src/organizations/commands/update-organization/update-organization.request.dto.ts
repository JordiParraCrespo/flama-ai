import { updateOrganizationSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateOrganizationRequest extends createZodDto(updateOrganizationSchema) {}
