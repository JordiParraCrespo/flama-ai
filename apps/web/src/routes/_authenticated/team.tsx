import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '@flama/design-system-web';
import type { RoleEntity } from '@flama/frontend';
import {
  useOrganizationInvitations,
  useOrganizationMembers,
  useOrganizations,
  useRoles,
  useUsersRoles,
} from '@flama/frontend/react';
import { createFileRoute } from '@tanstack/react-router';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHead } from '@/components/page-head';
import { MembersTab } from '@/components/team/members-tab';
import { RolesTab } from '@/components/team/roles-tab';

export const Route = createFileRoute('/_authenticated/team')({
  component: TeamPage,
});

/**
 * The open tab is in the URL with the tables' own state.
 *
 * Both tabs keep their search and page (under `members_` and `roles_`), and a
 * link carrying `roles_q` that opens on Members describes a table the reader
 * cannot see. The tab has to travel with them.
 */
const TABS = ['members', 'roles'] as const;

function TeamPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('members'));
  const organizations = useOrganizations();
  const organization = organizations.data?.[0];
  const organizationId = organization?.id ?? '';
  const members = useOrganizationMembers(organizationId);
  const invitations = useOrganizationInvitations(organizationId);
  // The whole set, not a page: this list fills the members tab's role facet and
  // labels its rows, and the tab count reads `meta.total`. The roles *table* has
  // its own paged query inside `RolesTab`.
  const roles = useRoles({ limit: 100 });
  const userRoleQueries = useUsersRoles(members.data?.map((member) => member.userId) ?? []);

  const userRoles = useMemo(() => {
    const result = new Map<string, RoleEntity[]>();
    members.data?.forEach((member, index) => {
      result.set(member.userId, userRoleQueries[index]?.data ?? []);
    });
    return result;
  }, [members.data, userRoleQueries]);

  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const assignedRoles of userRoles.values()) {
      for (const role of assignedRoles) counts.set(role.id, (counts.get(role.id) ?? 0) + 1);
    }
    return counts;
  }, [userRoles]);

  if (organizations.isLoading) {
    return <p className="text-sm text-ink-400">{t('pages.team.common.loading')}</p>;
  }

  return (
    <>
      <PageHead
        title={t('pages.team.title')}
        sub={t('pages.team.description', {
          workspace: organization?.name ?? '',
        })}
      />

      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next as (typeof TABS)[number])}
        className="gap-6"
      >
        <TabsList variant="line">
          <TabsTrigger value="members">
            {t('pages.team.tabs.members')}
            <TabsCount>{members.data?.length ?? 0}</TabsCount>
          </TabsTrigger>
          <TabsTrigger value="roles">
            {t('pages.team.tabs.roles')}
            <TabsCount>{roles.data?.meta.total ?? 0}</TabsCount>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <MembersTab
            organizationId={organizationId}
            members={members.data ?? []}
            invitations={invitations.data ?? []}
            roles={roles.data?.data ?? []}
            userRoles={userRoles}
            loading={members.isLoading || invitations.isLoading}
          />
        </TabsContent>

        <TabsContent value="roles">
          {/* No `roles` prop: the tab searches, and this list must not — the
              members tab uses it to label rows and fill its role facet. */}
          <RolesTab roleCounts={roleCounts} />
        </TabsContent>
      </Tabs>
    </>
  );
}
