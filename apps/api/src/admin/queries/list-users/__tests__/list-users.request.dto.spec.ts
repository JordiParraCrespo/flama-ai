import { describe, expect, it } from 'vitest';
import { listUsersSchema } from '../list-users.request.dto';

describe('listUsersSchema', () => {
  it('reads the page bounds from query-string text', () => {
    expect(
      listUsersSchema.parse({
        searchValue: 'ali',
        searchField: 'email',
        limit: '20',
        offset: '5',
        sortBy: 'name',
        sortDirection: 'asc',
      }),
    ).toEqual({
      searchValue: 'ali',
      searchField: 'email',
      limit: 20,
      offset: 5,
      sortBy: 'name',
      sortDirection: 'asc',
    });
  });

  it('leaves absent bounds undefined', () => {
    const filter = listUsersSchema.parse({});
    expect(filter.limit).toBeUndefined();
    expect(filter.offset).toBeUndefined();
  });

  it('refuses a page larger than a hundred', () => {
    expect(listUsersSchema.safeParse({ limit: '500' }).success).toBe(false);
  });
});
