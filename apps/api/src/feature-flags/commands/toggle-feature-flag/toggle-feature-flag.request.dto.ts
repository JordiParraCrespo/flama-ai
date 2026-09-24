import { toggleFeatureFlagSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class ToggleFeatureFlagRequest extends createZodDto(toggleFeatureFlagSchema) {}
