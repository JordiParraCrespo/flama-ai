'use client';

import {
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import { shareEntities } from './share-entities';

/**
 * What an entity query hook accepts as `options`: everything but the key and
 * the fetch, which are the hook's own, and the sharing, which is
 * {@link useEntityQuery}'s.
 */
export type EntityQueryOptions<TData, TError = Error> = Omit<
  UseQueryOptions<TData, TError>,
  'queryKey' | 'queryFn' | 'structuralSharing'
>;

/**
 * `useQuery` for data made of entities: the same options, with
 * `structuralSharing` fixed to {@link shareEntities}.
 *
 * Every query hook that returns entities goes through this rather than
 * `useQuery`, so the sharing is not a line each hook has to remember — a hook
 * that forgot it handed every reader a new object per row on every refetch,
 * and nothing failed. A query whose data is not entities (plain records, a
 * permission list) keeps `useQuery` and the client's default sharing.
 *
 * ```ts
 * export function useThings(options?: EntityQueryOptions<ThingEntity[]>) {
 *   const app = useConsumerApp();
 *   return useEntityQuery({
 *     queryKey: thingsKeys.list(),
 *     queryFn: () => app.things.findAll(),
 *     ...options,
 *   });
 * }
 * ```
 */
export function useEntityQuery<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'structuralSharing'>,
): UseQueryResult<TData, TError> {
  // Last, so a `structuralSharing` that slips into `options` untyped cannot
  // switch it off.
  return useQuery({ ...options, structuralSharing: shareEntities });
}
