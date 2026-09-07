import { updateProfileSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateProfileRequest extends createZodDto(updateProfileSchema) {}
