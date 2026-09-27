import type { UseMutationResult } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TOKENS } from '../../di/tokens';
import { ApiTokenEntity } from '../../modules/api-tokens/api-token.entity';
import * as entry from '../index';
import { exported, invalidated, setup } from './_eval-harness';

type Rename = (options?: {
  onSuccess?: (...args: unknown[]) => unknown;
}) => UseMutationResult<ApiTokenEntity, Error, { id: string; name: string }>;

const token = (name: string) =>
  new ApiTokenEntity(
    'token-1',
    name,
    'flm_abc',
    ['users:read'],
    null,
    null,
    null,
    null,
    null,
    new Date(0),
  );

function arrange() {
  const service = {
    rename: vi.fn(async (_id: string, name: string) => token(name)),
    findAll: vi.fn(async () => [token('Renamed')]),
    permissions: vi.fn(async () => ({ groups: [], grantable: [] })),
    currentCredential: vi.fn(async () => {
      throw new Error('the current credential was asked for again');
    }),
  };
  const { queryClient, wrapper } = setup({ [TOKENS.ApiTokensService]: service });
  const keys = entry.apiTokensKeys;
  queryClient.setQueryData(keys.list(), [token('CI deploy')]);
  queryClient.setQueryData(keys.permissions(), { groups: [], grantable: [] });
  queryClient.setQueryData(keys.credential(), { kind: 'session' });
  queryClient.setQueryData(entry.profileKeys.me(), { id: 'user-1' });
  return { service, queryClient, wrapper, keys };
}

async function rename(onSuccess = vi.fn()) {
  const arranged = arrange();
  const useRenameApiToken = exported<Rename>(entry, 'useRenameApiToken');
  const { result } = renderHook(() => useRenameApiToken({ onSuccess }), {
    wrapper: arranged.wrapper,
  });
  act(() => result.current.mutate({ id: 'token-1', name: 'Renamed' }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return { ...arranged, onSuccess };
}

describe('api-token-rename', () => {
  it('exports useRenameApiToken from the react entry', () => {
    expect(typeof exported(entry, 'useRenameApiToken')).toBe('function');
  });

  it('shows the new name in the token list straight after, from the row the API answered with', async () => {
    const { queryClient, keys } = await rename();
    const list = queryClient.getQueryData<ApiTokenEntity[]>(keys.list());
    expect(list?.map((row) => row.name)).toEqual(['Renamed']);
  });

  it("still runs a caller's onSuccess: the dialog closes itself there", async () => {
    const { onSuccess } = await rename();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('leaves the permission catalog and the current credential alone: a name changes neither', async () => {
    const { queryClient, keys, service } = await rename();
    expect(invalidated(queryClient, keys.permissions())).toBe(false);
    expect(invalidated(queryClient, keys.credential())).toBe(false);
    expect(service.permissions).not.toHaveBeenCalled();
    expect(service.currentCredential).not.toHaveBeenCalled();
  });

  it("invalidates the narrowest keys, not the root or another feature's cache", async () => {
    const { queryClient, keys } = await rename();
    expect(invalidated(queryClient, entry.profileKeys.me())).toBe(false);
    const everyTokenKeyStale = queryClient
      .getQueryCache()
      .findAll({ queryKey: keys.all })
      .every((query) => query.state.isInvalidated);
    expect(everyTokenKeyStale).toBe(false);
  });
});
