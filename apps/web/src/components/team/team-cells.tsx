import { Avatar, AvatarFallback, AvatarImage } from '@flama/design-system-web';
import { RolePill } from '@/components/role-pill';
import { formatMediumDate } from '@/lib/format-date';

/**
 * The presentational pieces the members table is built from — one person and
 * the roles they hold.
 *
 * There is no empty row here any more: `DataTable` renders the empty state for
 * every table in the app, so the members and roles tabs no longer each keep
 * their own version of "nothing found".
 */

export function PersonCell({ name, image }: { name: string; image?: string | null }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <Avatar size={30}>
        {image && <AvatarImage src={image} alt="" />}
        <AvatarFallback gradient="purple">{initials}</AvatarFallback>
      </Avatar>
      <span className="font-medium text-ink-900">{name}</span>
    </div>
  );
}

/**
 * The roles a person holds, in the space of one line.
 *
 * The cell used to render `roles[0]`, and nothing ordered that list — so two
 * members holding exactly `admin` and `user` were labelled `admin` and `user`
 * respectively, according to which row the database happened to return first.
 * The list is sorted at the endpoint now, which makes the same set of roles
 * read the same way on every row; this only has to stop hiding the rest of it.
 *
 * It summarises rather than wrapping: a
 * member with four roles would otherwise be a row four times the height of its
 * neighbours. The names that do not fit are still on the row for a reader who
 * hovers, and for a screen reader.
 */
export function RolesCell({ roles }: { roles: string[] }) {
  const [first, ...rest] = roles;
  if (!first) return <span className="text-ink-400">—</span>;

  return (
    <span className="flex items-center gap-1.5" title={roles.join(', ')}>
      <RolePill role={first} />
      {rest.length > 0 && (
        <>
          <span aria-hidden="true" className="text-ink-400 text-xs tabular-nums">
            +{rest.length}
          </span>
          <span className="sr-only">{rest.join(', ')}</span>
        </>
      )}
    </span>
  );
}

/** Members and invitations carry dates as strings, and some of them are junk. */
export function formatDate(date: Date | string, locale: string): string {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '—';
  return formatMediumDate(value, locale);
}
