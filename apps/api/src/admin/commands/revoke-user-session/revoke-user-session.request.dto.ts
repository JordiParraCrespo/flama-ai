import { revokeSessionSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class RevokeUserSessionRequest extends createZodDto(revokeSessionSchema) {}
