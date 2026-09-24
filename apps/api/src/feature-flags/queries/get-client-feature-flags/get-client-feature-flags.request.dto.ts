import { clientFlagContextSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class GetClientFeatureFlagsRequest extends createZodDto(clientFlagContextSchema) {}
