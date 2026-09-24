import { describe, expect, it } from 'vitest';
import { usersKeys } from '../users.queries';

describe('usersKeys.list', () => {
  it('adds nothing for no params or empty params, so both share one entry', () => {
    expect(usersKeys.list()).toEqual(['users', 'list']);
    expect(usersKeys.list({})).toEqual(['users', 'list']);
    expect(usersKeys.list({ search: '' })).toEqual(['users', 'list']);
  });

  it('keeps the unfiltered list a prefix of a narrowed one', () => {
    const narrowed = usersKeys.list({ search: 'ada', page: 2 });
    expect(narrowed.slice(0, 2)).toEqual(usersKeys.list());
    expect(narrowed[2]).toEqual({ search: 'ada', page: 2 });
  });
});
