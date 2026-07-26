'use client';

import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import type { OrganizationEntity } from '../modules/organizations/organization.entity';
import { useFlamaApp } from './context';

export const organizationsKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationsKeys.all, 'list'] as const,
  list: () => [...organizationsKeys.lists()] as const,
};

/** The organizations the signed-in user belongs to. */
export function useOrganizations(
  options?: Omit<UseQueryOptions<OrganizationEntity[], Error>, 'queryKey' | 'queryFn'>,
) {
  const app = useFlamaApp();

  return useQuery({
    queryKey: organizationsKeys.list(),
    queryFn: () => app.organizations.findAll(),
    ...options,
  });
}
