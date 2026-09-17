import { Avatar, AvatarFallback } from '@flama/design-system-web';
import type { AdminUserEntity } from '@flama/frontend-admin';
import { initials } from '@/features/admin-users/lib/initials';

/** The users table's first column: avatar, name, address. */
export function UserCell({ user }: { user: AdminUserEntity }) {
  return (
    <span className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarFallback gradient="purple">{initials(user.name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink-900">{user.name}</span>
        <span className="block truncate text-xs text-ink-400">{user.email}</span>
      </span>
    </span>
  );
}
