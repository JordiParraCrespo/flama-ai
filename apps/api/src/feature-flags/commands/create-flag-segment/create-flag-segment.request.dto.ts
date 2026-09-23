import { createFlagSegmentSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateFlagSegmentRequest extends createZodDto(createFlagSegmentSchema) {}
