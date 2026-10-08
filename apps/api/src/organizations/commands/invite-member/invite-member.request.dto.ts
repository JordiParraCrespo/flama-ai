import { inviteMemberSchema } from '@flama/shared';
import { createZodDto } from 'nestjs-zod';

export class InviteMemberRequest extends createZodDto(inviteMemberSchema) {}
