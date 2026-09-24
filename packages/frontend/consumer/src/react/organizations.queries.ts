'use client';

import type { UpdateOrganizationRequest } from '@flama/api-client';
import { MEMBER_LISTS_KEY, withCacheOnSuccess } from '@flama/frontend-core/react';
import type { CreateOrganizationDto, InviteMemberDto, OrganizationRole } from '@flama/shared';
import {
  skipToken,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  OrganizationEntity,
  OrganizationInvitationEntity,
  OrganizationMemberEntity,
} from '../modules/organizations/organization.entity';
import type { MemberFilters } from '../modules/organizations/organizations.repository';
import { useConsumerApp } from './context';

/**
 * Query key factory for the `organizations` feature, one function per level.
 * Members and invitations are resources of their own and repeat the ladder
 * under their name, with the organization id inside the list rather than
 * straight after `all`:
 *
 * ```
 * ['organizations', 'members']                          members()       — MEMBER_LISTS_KEY
 * ['organizations', 'members', 'list']                  memberLists()
 * ['organizations', 'members', 'list', orgId, filters?] memberList(orgId, filters)
 * ['organizations', 'invitations']                      invitations()
 * ['organizations', 'invitations', 'list']              invitationLists()
 * ['organizations', 'invitations', 'list', orgId]       invitationList(orgId)
 * ['organizations', 'invitations', 'mine']              myInvitations()
 * ```
 *
 * `members()` is the kernel contract another product invalidates when it
 * changes what member lists are filtered by (a user's roles) without knowing
 * the organization; its tuple does not change.
 */
export const organizationsKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationsKeys.all, 'list'] as const,
  list: () => [...organizationsKeys.lists()] as const,
  members: () => MEMBER_LISTS_KEY,
  memberLists: () => [...organizationsKeys.members(), 'list'] as const,
  /**
   * The filters are one object appended only when a facet is set, so
   * `memberList(organizationId)` stays a *prefix* of every narrowed list: the
   * mutations below invalidate it, and TanStack matches by prefix.
   *
   * The role ids are sorted before they go in: picking `admin` then `user`
   * asks the same question as picking them the other way round, and an unsorted
   * key would fetch it twice and cache it under two entries. An empty facet is
   * no facet, so it adds nothing to the key.
   */
  memberList: (organizationId: string | undefined, filters?: MemberFilters) => {
    const narrowed: MemberFilters = {};
    if (filters?.search) narrowed.search = filters.search;
    if (filters?.roleIds?.length) narrowed.roleIds = [...filters.roleIds].sort();
    return [
      ...organizationsKeys.memberLists(),
      organizationId,
      ...(Object.keys(narrowed).length ? [narrowed] : []),
    ] as const;
  },
  invitations: () => [...organizationsKeys.all, 'invitations'] as const,
  invitationLists: () => [...organizationsKeys.invitations(), 'list'] as const,
  invitationList: (organizationId: string | undefined) =>
    [...organizationsKeys.invitationLists(), organizationId] as const,
  /** Invitations addressed to the caller, in no organization's scope. */
  myInvitations: () => [...organizationsKeys.invitations(), 'mine'] as const,
};

/** The organizations the signed-in user belongs to. */
export function useOrganizations(
  options?: Omit<UseQueryOptions<OrganizationEntity[], Error>, 'queryKey' | 'queryFn'>,
) {
  const app = useConsumerApp();

  return useQuery({
    queryKey: organizationsKeys.list(),
    queryFn: () => app.organizations.findAll(),
    ...options,
  });
}

/**
 * The organization's members, narrowed by the API rather than by the caller.
 *
 * `filters` is optional, and leaving it off is a real use: the team page keeps
 * one unnarrowed list to count the workspace and label its rows, alongside the
 * narrowed one the table renders.
 */
export function useOrganizationMembers(
  organizationId: string | undefined,
  filters?: MemberFilters,
  options?: Omit<UseQueryOptions<OrganizationMemberEntity[], Error>, 'queryKey' | 'queryFn'>,
) {
  const app = useConsumerApp();
  return useQuery({
    queryKey: organizationsKeys.memberList(organizationId, filters),
    queryFn: organizationId
      ? () => app.organizations.findMembers(organizationId, filters)
      : skipToken,
    ...options,
  });
}

export function useOrganizationInvitations(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<OrganizationInvitationEntity[], Error>, 'queryKey' | 'queryFn'>,
) {
  const app = useConsumerApp();
  return useQuery({
    queryKey: organizationsKeys.invitationList(organizationId),
    queryFn: organizationId ? () => app.organizations.findInvitations(organizationId) : skipToken,
    ...options,
  });
}

/**
 * Invitations addressed to the caller, whichever organization sent them.
 *
 * Unlike {@link useOrganizationInvitations} this needs no organization: it is
 * what an account that belongs to none can still ask, and the only thing it
 * can act on.
 */
export function useMyInvitations(
  options?: Omit<UseQueryOptions<OrganizationInvitationEntity[], Error>, 'queryKey' | 'queryFn'>,
) {
  const app = useConsumerApp();
  return useQuery({
    queryKey: organizationsKeys.myInvitations(),
    queryFn: () => app.organizations.findMyInvitations(),
    ...options,
  });
}

/**
 * Accept an invitation and land in the workspace it names.
 *
 * The whole cache is dropped rather than a list invalidated: accepting is what
 * puts the caller in a workspace, so their permissions, the nav those
 * permissions gate, and every org-scoped list were all answers to "who are you
 * and where" — and that question now has a different answer. A narrow
 * invalidation leaves the app's shell reading a cached "you belong nowhere"
 * and bouncing them back to the screen they just left.
 */
export function useAcceptInvitation(
  options?: UseMutationOptions<OrganizationInvitationEntity, Error, string>,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => app.organizations.acceptInvitation(invitationId),
    // Awaited, so the caller's `onSuccess` — which navigates into the shell —
    // runs only once the organizations list has been refetched. The shell
    // redirects a settled empty list to onboarding, and navigating while the
    // cached `[]` was still being refetched bounced the reader straight back.
    ...withCacheOnSuccess(options, async () => {
      await queryClient.invalidateQueries();
    }),
  });
}

/**
 * Create the caller's first (or next) organization.
 *
 * Like {@link useAcceptInvitation}, this drops the whole cache rather than one
 * list: creating a workspace is what puts the caller in one, and the shell,
 * the nav's permission set and every org-scoped list were all answers to "who
 * are you and where" — a narrow invalidation leaves the app reading a cached
 * "you belong nowhere" and bouncing them straight back to onboarding.
 *
 * The reply is the organization itself, so the list is seeded with it before
 * the refetch is awaited: even if that refetch fails, the cache no longer says
 * the caller belongs nowhere.
 */
export function useCreateOrganization(
  options?: UseMutationOptions<OrganizationEntity, Error, CreateOrganizationDto>,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateOrganizationDto) => app.organizations.create(dto),
    ...withCacheOnSuccess(options, async (organization) => {
      queryClient.setQueryData<OrganizationEntity[]>(organizationsKeys.list(), (current) => [
        ...(current ?? []),
        organization,
      ]);
      await queryClient.invalidateQueries();
    }),
  });
}

export interface InviteMembersVariables {
  organizationId: string;
  emails: string[];
  role: InviteMemberDto['role'];
}

export function useInviteMembers(
  options?: UseMutationOptions<OrganizationInvitationEntity[], Error, InviteMembersVariables>,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, emails, role }) =>
      Promise.all(emails.map((email) => app.organizations.invite(organizationId, { email, role }))),
    ...withCacheOnSuccess(options, (_data, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: organizationsKeys.invitationList(organizationId) });
    }),
  });
}

export function useUpdateOrganizationMemberRole(
  options?: UseMutationOptions<
    OrganizationMemberEntity,
    Error,
    { organizationId: string; memberId: string; role: OrganizationRole }
  >,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, memberId, role }) =>
      app.organizations.updateMemberRole(organizationId, memberId, role),
    ...withCacheOnSuccess(options, (_data, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: organizationsKeys.memberList(organizationId) });
    }),
  });
}

export function useRemoveOrganizationMember(
  options?: UseMutationOptions<void, Error, { organizationId: string; memberId: string }>,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, memberId }) =>
      app.organizations.removeMember(organizationId, memberId),
    ...withCacheOnSuccess(options, (_data, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: organizationsKeys.memberList(organizationId) });
    }),
  });
}

export function useCancelOrganizationInvitation(
  options?: UseMutationOptions<void, Error, { organizationId: string; invitationId: string }>,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invitationId }) => app.organizations.cancelInvitation(invitationId),
    ...withCacheOnSuccess(options, (_data, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: organizationsKeys.invitationList(organizationId) });
    }),
  });
}

export interface UpdateOrganizationVariables {
  id: string;
  changes: UpdateOrganizationRequest;
}

/**
 * Rename an organization or change its mark.
 *
 * The reply is one organization while the cache holds the caller's whole list,
 * so the updated record is patched into that list rather than replacing it —
 * refetching would drop the other organizations for as long as the request
 * takes.
 */
export function useUpdateOrganization(
  options?: UseMutationOptions<OrganizationEntity, Error, UpdateOrganizationVariables>,
) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: UpdateOrganizationVariables) =>
      app.organizations.update(id, changes),
    ...withCacheOnSuccess(options, (organization) => {
      queryClient.setQueryData<OrganizationEntity[]>(organizationsKeys.list(), (current) =>
        current?.map((entry) => (entry.id === organization.id ? organization : entry)),
      );
    }),
  });
}
