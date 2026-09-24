import { updateOrganizationSchema } from '@flama/shared/schemas/organization';
import { z } from 'zod';

/**
 * What the general-settings card edits: the organization's name and its mark.
 * Both are required on the form even though the API takes each optionally — a
 * card that saves "no name" is not one anybody asked for — and an empty logo
 * means "remove it", which the request spells `null`.
 */
export const organizationFormSchema = z.object({
  name: updateOrganizationSchema.shape.name.unwrap(),
  logo: z.string().url().or(z.literal('')),
});

export type OrganizationFormDto = z.infer<typeof organizationFormSchema>;
