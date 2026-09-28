import { deleteFlagSegmentSchema } from '@flama/shared/feature-flags';
import { createZodDto } from 'nestjs-zod';

export class DeleteFlagSegmentRequest extends createZodDto(deleteFlagSegmentSchema) {}
