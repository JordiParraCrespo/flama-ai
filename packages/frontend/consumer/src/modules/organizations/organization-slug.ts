import type { CreateOrganizationDto } from '@flama/shared/schemas/organization';

/**
 * The slug the API would derive anyway, shown so the reader is not surprised
 * by it. Kept in step with `createOrganizationSchema`'s pattern: lowercase,
 * digits and hyphens, at least two characters.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * The create request for a workspace named `name`. A name with no slug-able
 * characters ("日本") is the API's to name: sending `slug: ''` would fail the
 * schema's floor for no reason the reader can fix.
 */
export function toCreateOrganizationDto(name: string): CreateOrganizationDto {
  const slug = slugify(name);
  return slug.length >= 2 ? { name, slug } : { name };
}
