import { Avatar, AvatarFallback, AvatarImage } from '@flama/design-system-web';
import type { ProfileEntity } from '@flama/frontend-consumer';

/** Avatar, name and address on one line. Props only. */
export function Person({ user }: { user: ProfileEntity }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="sm">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
        <AvatarFallback>{user.initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-900">{user.fullName}</p>
        <p className="truncate text-xs text-ink-600">{user.email}</p>
      </div>
    </div>
  );
}
