import {
  Badge,
  Button,
  DropdownMenuItem,
  DropdownMenuSeparator,
  KpiCard,
} from '@flama/design-system-web';
import {
  Activity,
  Download,
  Mail,
  Search,
  Trash2,
  UserPlus,
  Users,
} from '@flama/design-system-web/icons';
import type {
  OrganizationInvitationEntity,
  OrganizationMemberEntity,
  RoleEntity,
} from '@flama/frontend';
import { useOrganizationMembers } from '@flama/frontend/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  type DataTableColumn,
  TABLE_HEADER_CONTROL_SIZE,
} from '@/components/data-table';
import { downloadCsvRows } from '@/lib/download-csv';
import { paginateRows } from '@/lib/paginate-rows';
import { useLocale } from '@/lib/use-locale';
import { useTableQuery } from '@/lib/use-table-query';
import { CancelInvitationDialog, RemoveMemberDialog } from './confirm-dialog';
import { InviteDialog } from './invite-dialog';
import { MemberRoleDialog } from './member-role-dialog';
import { formatDate, PersonCell, RolesCell } from './team-cells';

/** The design's members table shows six rows before it pages. */
const PAGE_SIZE = 6;

/** One identity for "the query has not answered yet", so the row memo holds. */
const NO_MEMBERS: OrganizationMemberEntity[] = [];

/**
 * A member who has joined and an invitation that has not been accepted are two
 * different records on one endpoint each, and the table shows them in the same
 * list — so they meet here as one row type rather than as two `map`s the reader
 * has to tell apart by which columns are dashes.
 */
type MemberRow =
  | { kind: 'member'; id: string; member: OrganizationMemberEntity }
  | {
      kind: 'invitation';
      id: string;
      invitation: OrganizationInvitationEntity;
    };

export function MembersTab({
  organizationId,
  members,
  invitations,
  roles,
  userRoles,
  loading,
}: {
  organizationId: string;
  /**
   * The workspace's members, unnarrowed — what the KPI cards count. The rows
   * come from the narrowed query below, and counting those would make "Members"
   * fall to 1 the moment somebody typed a name or picked a role.
   */
  members: OrganizationMemberEntity[];
  invitations: OrganizationInvitationEntity[];
  roles: RoleEntity[];
  userRoles: Map<string, RoleEntity[]>;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  // Prefixed: members and roles are two tables on one route, and unprefixed
  // they would both answer to `?q=` — searching one would search the other.
  const query = useTableQuery({ prefix: 'members' });
  const { search, searchQuery, filters: roleFilter, isFiltered } = query;

  /**
   * Narrowed here rather than in `team.tsx`, which keeps its own unnarrowed
   * list: that one feeds the tab's count, the per-user role lookups and the
   * roles tab's holder counts, and a search or a facet would quietly narrow all
   * three.
   *
   * Both filters are the server's answer. `GET /:orgId/members` takes `search`
   * — matching name, email, the organization role and the names of any assigned
   * roles, every field this table puts on the row, so searching for something
   * visible cannot come back empty — and `roleIds`, keeping members who hold
   * any of the picked roles. Neither is applied to the rows after they arrive:
   * this table pages what it is handed, and a facet applied here would narrow
   * the six rows on screen while leaving every other match on a page nobody
   * opens.
   */
  const narrowed = useOrganizationMembers(organizationId, {
    search: searchQuery || undefined,
    roleIds: roleFilter,
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleMember, setRoleMember] = useState<OrganizationMemberEntity | null>(null);
  const [removeMember, setRemoveMember] = useState<OrganizationMemberEntity | null>(null);
  const [cancelInvitation, setCancelInvitation] = useState<OrganizationInvitationEntity | null>(
    null,
  );

  const matchingMembers = narrowed.data ?? NO_MEMBERS;

  /**
   * Invitations follow the role facet and ignore the search.
   *
   * The two are different questions. A search is a name or an address, and an
   * invitation's address is one — but it is one nobody has typed yet, so
   * hiding a pending invite behind a query the reader ran to find *members*
   * would make it look like an invite that was never sent. A role facet is not
   * a guess: a pending invitation holds no assigned role, so it matches none of
   * them, and leaving it on screen is what made the facet look broken — the
   * reader picked "superadmin" and kept looking at rows that plainly were not.
   */
  const rows: MemberRow[] = useMemo(
    () => [
      ...matchingMembers.map((member) => ({
        kind: 'member' as const,
        // Prefixed because the two halves of this list are keyed by two
        // different tables, and React only needs one of them to collide.
        id: `member:${member.id}`,
        member,
      })),
      ...(roleFilter.length > 0
        ? []
        : invitations.map((invitation) => ({
            kind: 'invitation' as const,
            id: `invitation:${invitation.id}`,
            invitation,
          }))),
    ],
    [matchingMembers, invitations, roleFilter],
  );

  const page = paginateRows(rows, PAGE_SIZE, query);

  const activeCount = members.filter((member) => member.isActive).length;

  // The design's column widths: they sum wider than a narrow viewport, so the
  // card scrolls sideways rather than crushing a name into an ellipsis.
  const columns: DataTableColumn<MemberRow>[] = [
    {
      key: 'name',
      label: t('pages.team.members.columns.name'),
      width: 210,
      render: (row) =>
        row.kind === 'member' ? (
          <PersonCell name={row.member.name} image={row.member.image} />
        ) : (
          // An invitation has no name yet — the local part of the address is
          // the closest thing to one, and it is what the row is recognised by.
          <PersonCell name={row.invitation.email.split('@')[0] ?? row.invitation.email} />
        ),
    },
    {
      key: 'email',
      label: t('pages.team.members.columns.email'),
      width: 200,
      render: (row) => (
        <span className="block max-w-52 truncate text-ink-600">
          {row.kind === 'member' ? row.member.email || '—' : row.invitation.email}
        </span>
      ),
    },
    {
      key: 'role',
      label: t('pages.team.members.columns.role'),
      width: 150,
      /**
       * Every role the person holds, not whichever one came back first.
       *
       * There is no privilege ordering in a free-form role table, so no single
       * role is *the* role and picking one was never honest — `RolesCell` shows
       * the first and counts the rest.
       *
       * Names are rendered as they are stored, never title-cased. They are
       * user-created values — title-casing turns `superadmin` into a role
       * nobody named and `SEO Manager` into `Seo Manager` — and the Role facet
       * lists them verbatim, so a column that dressed them up would not match
       * the filter that finds them.
       */
      render: (row) => {
        const assigned =
          row.kind === 'member'
            ? (userRoles.get(row.member.userId) ?? []).map((role) => role.name)
            : [];

        // A member holding no assigned role, and every pending invitation, have
        // only the organization role to show. It is a different vocabulary
        // (owner/admin/member) and the column cannot say so — but a blank where
        // a role belongs reads as "no access", which is not what it means.
        return (
          <RolesCell
            roles={
              assigned.length
                ? assigned
                : [
                    row.kind === 'member'
                      ? row.member.organizationRole
                      : row.invitation.organizationRole,
                  ]
            }
          />
        );
      },
    },
    {
      key: 'status',
      label: t('pages.team.members.columns.status'),
      width: 120,
      render: (row) =>
        row.kind === 'member' ? (
          <Badge variant={row.member.isActive ? 'active' : 'paused'}>
            {t(
              row.member.isActive
                ? 'pages.team.members.status.active'
                : 'pages.team.members.status.inactive',
            )}
          </Badge>
        ) : (
          <Badge variant="draft">{t('pages.team.members.status.invited')}</Badge>
        ),
    },
    {
      key: 'joined',
      label: t('pages.team.members.columns.joined'),
      width: 100,
      align: 'right',
      render: (row) => (
        <span className="text-ink-600">
          {formatDate(
            row.kind === 'member' ? row.member.joinedAt : row.invitation.createdAt,
            locale,
          )}
        </span>
      ),
    },
  ];

  // Shared by the toolbar's export (every matching member) and the selection
  // toolbar's export (just the ticked rows), so the two cannot drift apart.
  const exportLabels: MemberExportLabels = {
    name: t('pages.team.members.columns.name'),
    email: t('pages.team.members.columns.email'),
    role: t('pages.team.members.columns.organizationRole'),
    status: t('pages.team.members.columns.status'),
    joined: t('pages.team.members.columns.joined'),
    active: t('pages.team.members.status.active'),
    inactive: t('pages.team.members.status.inactive'),
    invited: t('pages.team.members.status.invited'),
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label={t('pages.team.stats.members')} value={members.length} icon={<Users />} />
        <KpiCard label={t('pages.team.stats.active')} value={activeCount} icon={<Activity />} />
        <KpiCard label={t('pages.team.stats.pending')} value={invitations.length} icon={<Mail />} />
      </div>

      <DataTable
        columns={columns}
        rows={page.rows}
        pagination={page.pagination}
        getKey={(row) => row.id}
        isLoading={loading || narrowed.isLoading}
        // An empty *narrowed* table is the reader's own doing; an empty
        // workspace is not, and telling them apart is the difference between
        // "nobody is here" and "nobody matches what you picked".
        emptyLabel={t(isFiltered ? 'pages.team.members.noMatches' : 'pages.team.members.empty')}
        emptyIcon={isFiltered ? <Search /> : <Users />}
        search={{
          value: search,
          onChange: query.setSearch,
          placeholder: t('pages.team.members.search'),
        }}
        facets={[
          {
            label: t('pages.team.members.columns.role'),
            value: roleFilter,
            onChange: query.setFilters,
            options: roles.map((role) => ({ value: role.id, label: role.name })),
          },
        ]}
        actions={[
          {
            label: t('pages.team.members.export'),
            icon: <Download />,
            onClick: () => exportMembers(matchingMembers, exportLabels),
          },
        ]}
        // Selecting rows exports them — a safe, non-destructive bulk action.
        // Role and removal stay per-row, each being one person's own. A ticked row exports as a row whichever kind it
        // is: an invitation has no name yet, so it writes an "Invited" line under
        // its address rather than being dropped from a file whose row count would
        // then disagree with the selection.
        bulkActions={(selected) => (
          <Button
            variant="secondary"
            size={TABLE_HEADER_CONTROL_SIZE}
            onClick={() =>
              exportMemberRows(
                page.rows.filter((row) => selected.includes(row.id)),
                exportLabels,
              )
            }
          >
            <Download />
            {t('pages.team.members.export')}
          </Button>
        )}
        addAction={{
          label: t('pages.team.members.invite'),
          icon: <UserPlus />,
          onClick: () => setInviteOpen(true),
        }}
        rowActions={(row) =>
          row.kind === 'member' ? (
            <>
              <DropdownMenuItem onClick={() => setRoleMember(row.member)}>
                {t('pages.team.members.editRole')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setRemoveMember(row.member)}>
                <Trash2 />
                {t('pages.team.members.remove')}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setCancelInvitation(row.invitation)}
            >
              <Trash2 />
              {t('pages.team.members.cancelInvite')}
            </DropdownMenuItem>
          )
        }
      />

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationId={organizationId}
      />
      {roleMember && (
        <MemberRoleDialog
          key={roleMember.id}
          member={roleMember}
          roles={roles}
          assignedRoles={userRoles.get(roleMember.userId) ?? []}
          onClose={() => setRoleMember(null)}
        />
      )}
      {removeMember && (
        <RemoveMemberDialog
          member={removeMember}
          organizationId={organizationId}
          onClose={() => setRemoveMember(null)}
        />
      )}
      {cancelInvitation && (
        <CancelInvitationDialog
          invitation={cancelInvitation}
          organizationId={organizationId}
          onClose={() => setCancelInvitation(null)}
        />
      )}
    </div>
  );
}

/**
 * The headers and the status column are translated, matching the domains
 * export — a reader who exports both should not get one file in their language
 * and one in English. Labels are resolved by the caller rather than handing `t`
 * down: react-i18next's `t` is generic over the whole catalog and does not
 * survive being passed through a plain function signature.
 *
 * The joined date stays ISO-8601 on purpose. It is the one column a spreadsheet
 * has to parse, and a localised date is exactly what it cannot.
 */
interface MemberExportLabels {
  name: string;
  email: string;
  /** The workspace-level role (owner/admin/member), not the assigned DB role. */
  role: string;
  status: string;
  joined: string;
  active: string;
  inactive: string;
  invited: string;
}

const MEMBER_EXPORT_HEADER = (labels: MemberExportLabels) => [
  labels.name,
  labels.email,
  labels.role,
  labels.status,
  labels.joined,
];

function memberCsvRow(member: OrganizationMemberEntity, labels: MemberExportLabels): string[] {
  return [
    member.name,
    member.email,
    member.organizationRole,
    member.isActive ? labels.active : labels.inactive,
    new Date(member.joinedAt).toISOString(),
  ];
}

function invitationCsvRow(
  invitation: OrganizationInvitationEntity,
  labels: MemberExportLabels,
): string[] {
  // No name yet — the address is the identity, and "Invited" is what the row's
  // status reads on screen.
  return [
    '',
    invitation.email,
    invitation.organizationRole,
    labels.invited,
    new Date(invitation.createdAt).toISOString(),
  ];
}

/** The toolbar export: every matching member, across pages. */
function exportMembers(members: OrganizationMemberEntity[], labels: MemberExportLabels): void {
  downloadCsvRows(
    'members.csv',
    MEMBER_EXPORT_HEADER(labels),
    members.map((member) => memberCsvRow(member, labels)),
  );
}

/**
 * The selection export: exactly the ticked rows, members and invitations alike,
 * so the file's row count matches "N selected".
 */
function exportMemberRows(rows: MemberRow[], labels: MemberExportLabels): void {
  downloadCsvRows(
    'members.csv',
    MEMBER_EXPORT_HEADER(labels),
    rows.map((row) =>
      row.kind === 'member'
        ? memberCsvRow(row.member, labels)
        : invitationCsvRow(row.invitation, labels),
    ),
  );
}
