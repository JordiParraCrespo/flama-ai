import { updateFeatureFlagSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateFeatureFlagRequest extends createZodDto(updateFeatureFlagSchema) {}
