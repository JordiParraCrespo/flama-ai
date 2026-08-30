import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  // Free-form role name; roles are managed dynamically via the roles module.
  role: z.string().min(1).default('user'),
});

/**
 * Self-service profile edit. `role` is omitted deliberately: it is a privilege
 * field, and a schema that accepts one on the endpoint a user calls to change
 * their own name is a privilege-escalation path however carefully the handler
 * is written. Role changes go through `PUT /v1/users/:userId/roles`, which is
 * gated on `manage User`, or the admin plugin's `set-role`.
 */
export const updateUserSchema = createUserSchema.partial().omit({ email: true, role: true });

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  /** Legacy primary role name (kept for backwards compatibility). */
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
