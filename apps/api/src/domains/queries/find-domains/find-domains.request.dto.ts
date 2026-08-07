import { findDomainsSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class FindDomainsRequest extends createZodDto(findDomainsSchema) {}
