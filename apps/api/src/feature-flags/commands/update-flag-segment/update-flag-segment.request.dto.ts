import { updateFlagSegmentSchema } from '@flama/shared/feature-flags';
import { createZodDto } from 'nestjs-zod';

export class UpdateFlagSegmentRequest extends createZodDto(updateFlagSegmentSchema) {}
