import { randomUUID } from 'node:crypto';

/**
 * The slug an organization gets when its creator names none: the name,
 * lowercased and hyphenated, cut to 32 characters, with a random suffix so two
 * organizations called the same thing do not collide. A name with nothing
 * alphanumeric in it falls back to `org`.
 */
export function deriveOrganizationSlug(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${cleaned || 'org'}-${randomUUID().slice(0, 8)}`;
}
