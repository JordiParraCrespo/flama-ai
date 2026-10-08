import { createWorkspaceSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateWorkspaceRequest extends createZodDto(createWorkspaceSchema) {}
