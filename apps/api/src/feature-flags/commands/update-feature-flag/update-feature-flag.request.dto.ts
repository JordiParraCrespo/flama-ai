import { updateFeatureFlagSchema } from '@flama/shared/feature-flags';
import { createZodDto } from 'nestjs-zod';

export class UpdateFeatureFlagRequest extends createZodDto(updateFeatureFlagSchema) {}
