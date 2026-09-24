import { deleteFlagSegmentSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class DeleteFlagSegmentRequest extends createZodDto(deleteFlagSegmentSchema) {}
