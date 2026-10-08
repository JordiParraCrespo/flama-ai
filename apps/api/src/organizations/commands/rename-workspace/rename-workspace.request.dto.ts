import { updateWorkspaceSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateWorkspaceRequest extends createZodDto(updateWorkspaceSchema) {}
