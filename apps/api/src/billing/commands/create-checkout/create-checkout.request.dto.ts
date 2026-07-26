import { createCheckoutSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateCheckoutRequest extends createZodDto(createCheckoutSchema) {}
