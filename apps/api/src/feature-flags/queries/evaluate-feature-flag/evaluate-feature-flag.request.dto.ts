import { evaluateFeatureFlagSchema } from '@flama/shared/feature-flags';
import { createZodDto } from 'nestjs-zod';

export class EvaluateFeatureFlagRequest extends createZodDto(evaluateFeatureFlagSchema) {}
