import { evaluateFeatureFlagSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class EvaluateFeatureFlagRequest extends createZodDto(evaluateFeatureFlagSchema) {}
