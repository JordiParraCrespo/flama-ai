import { createDomainSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class ConnectDomainRequest extends createZodDto(createDomainSchema) {}
