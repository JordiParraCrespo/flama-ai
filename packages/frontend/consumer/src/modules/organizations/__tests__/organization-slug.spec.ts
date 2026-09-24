import { describe, expect, it } from 'vitest';
import { slugify, toCreateOrganizationDto } from '../organization-slug';

describe('slugify', () => {
  it('lowercases, strips accents and joins words with hyphens', () => {
    expect(slugify('  Café Olé & Co. ')).toBe('cafe-ole-co');
  });

  it('caps the slug at 48 characters', () => {
    expect(slugify('a'.repeat(60))).toHaveLength(48);
  });
});

describe('toCreateOrganizationDto', () => {
  it('sends the slug when it is long enough', () => {
    expect(toCreateOrganizationDto('Acme Inc')).toEqual({ name: 'Acme Inc', slug: 'acme-inc' });
  });

  it('leaves naming to the API when nothing slug-able remains', () => {
    expect(toCreateOrganizationDto('日本')).toEqual({ name: '日本' });
  });
});
