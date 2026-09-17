import { resetPasswordSchema } from '@flama/shared';
import { z } from 'zod';

/**
 * The token arrives in the deep link, so only the two password fields are user
 * input. Whether they match is not a schema rule: the live checklist on the
 * screen already reports it and gates the submit button, and a `refine()` would
 * need a message string, which the shared schemas deliberately never carry.
 */
export const newPasswordSchema = resetPasswordSchema
  .pick({ password: true })
  .extend({ confirmPassword: z.string().min(8) });

export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
