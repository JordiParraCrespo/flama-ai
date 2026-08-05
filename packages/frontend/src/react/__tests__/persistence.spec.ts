import { type Query, QueryClient, type QueryKey, type QueryState } from '@tanstack/query-core';
import { describe, expect, it } from 'vitest';
import { apiTokensKeys } from '../api-tokens.queries';
import { authKeys } from '../auth.queries';
import { organizationsKeys } from '../organizations.queries';
import {
  createQueryPersistOptions,
  QUERY_PERSIST_GC_TIME,
  QUERY_PERSIST_MAX_AGE,
  shouldDehydrateQuery,
} from '../persistence';
import { usersKeys } from '../users.queries';

/** A real `Query` in the given state — dehydration reads `state` and `queryKey`. */
function query(queryKey: QueryKey, status: QueryState['status'] = 'success'): Query {
  const client = new QueryClient();
  const q = client.getQueryCache().build(client, { queryKey });

  if (status === 'success') q.setState({ status: 'success', data: { ok: true } });
  if (status === 'error') q.setState({ status: 'error', error: new Error('boom') });

  return q;
}

describe('shouldDehydrateQuery', () => {
  it('persists ordinary feature queries', () => {
    expect(shouldDehydrateQuery(query(usersKeys.list()))).toBe(true);
    expect(shouldDehydrateQuery(query(usersKeys.me()))).toBe(true);
    expect(shouldDehydrateQuery(query(organizationsKeys.list()))).toBe(true);
  });

  it('never persists the auth session or credential data', () => {
    expect(shouldDehydrateQuery(query(authKeys.session()))).toBe(false);
    expect(shouldDehydrateQuery(query(apiTokensKeys.list()))).toBe(false);
    expect(shouldDehydrateQuery(query(apiTokensKeys.permissions()))).toBe(false);
    expect(shouldDehydrateQuery(query(apiTokensKeys.credential()))).toBe(false);
  });

  it('only persists successful queries', () => {
    expect(shouldDehydrateQuery(query(usersKeys.list(), 'error'))).toBe(false);
    expect(shouldDehydrateQuery(query(usersKeys.list(), 'pending'))).toBe(false);
  });

  it('ignores keys that do not start with a feature string', () => {
    expect(shouldDehydrateQuery(query([{ scope: 'users' }]))).toBe(false);
  });
});

describe('createQueryPersistOptions', () => {
  it('caps restored entries at the persist window and busts on version', () => {
    const options = createQueryPersistOptions('1.2.3');

    expect(options.maxAge).toBe(QUERY_PERSIST_MAX_AGE);
    expect(options.buster).toBe('1.2.3');
    expect(options.dehydrateOptions.shouldDehydrateQuery).toBe(shouldDehydrateQuery);
  });

  it('keeps queries alive at least as long as they are persisted', () => {
    // A query collected before it is written would persist nothing.
    expect(QUERY_PERSIST_GC_TIME).toBeGreaterThanOrEqual(QUERY_PERSIST_MAX_AGE);
  });
});
