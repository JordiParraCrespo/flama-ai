import { toggleFeatureFlagSchema } from '@flama/shared/feature-flags';
import { createZodDto } from 'nestjs-zod';

export class ToggleFeatureFlagRequest extends createZodDto(toggleFeatureFlagSchema) {}
