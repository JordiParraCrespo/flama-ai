import { createFlagSegmentSchema } from '@flama/shared/feature-flags';
import { createZodDto } from 'nestjs-zod';

export class CreateFlagSegmentRequest extends createZodDto(createFlagSegmentSchema) {}
