import { updateUserSettingsSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateUserSettingsRequest extends createZodDto(updateUserSettingsSchema) {}
