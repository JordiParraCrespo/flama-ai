import { updateFlagSegmentSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateFlagSegmentRequest extends createZodDto(updateFlagSegmentSchema) {}
