import { clientFlagContextSchema } from '@flama/shared/feature-flags';
import { createZodDto } from 'nestjs-zod';

export class GetClientFeatureFlagsRequest extends createZodDto(clientFlagContextSchema) {}
