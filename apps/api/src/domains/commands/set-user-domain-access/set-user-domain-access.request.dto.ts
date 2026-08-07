import { setUserDomainAccessSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class SetUserDomainAccessRequest extends createZodDto(setUserDomainAccessSchema) {}
