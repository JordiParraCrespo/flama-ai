import { setUserPasswordSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class SetUserPasswordRequest extends createZodDto(setUserPasswordSchema) {}
