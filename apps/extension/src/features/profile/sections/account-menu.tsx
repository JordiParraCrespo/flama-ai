import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
} from '@flama/design-system-web';
import { LogOut } from '@flama/design-system-web/icons';
import { useMyProfile } from '@flama/frontend-consumer/react';
import { useLogout } from '@flama/frontend-core/react';
import { useTranslation } from 'react-i18next';
import { Person } from '@/features/profile/components/person';
import { useCurrentWindow } from '@/features/profile/hooks/use-current-window';
import { MENU } from '@/lib/nav';
import { broadcast } from '@/runtime/messaging';

/**
 * The account button in a page's header: who is signed in, where else to go,
 * and the way out. Signing out tells the other open pages, whose gates then
 * fall back to the sign-in screen.
 */
export function AccountMenu() {
  const { t } = useTranslation();
  const { data: user } = useMyProfile();
  const logout = useLogout();
  const windowId = useCurrentWindow();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton variant="ghost" size="default" aria-label={t('extension.nav.account')} />
        }
      >
        <Avatar size="sm">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback>{user?.initials ?? ''}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {user && (
          <>
            <div className="px-2 py-1.5">
              <Person user={user} />
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {MENU.map((item) => (
          <DropdownMenuItem
            key={item.labelKey}
            disabled={windowId === undefined}
            onClick={() => windowId !== undefined && void item.go(windowId)}
          >
            <item.icon className="size-4" />
            {t(`extension.nav.${item.labelKey}`)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, { onSuccess: () => void broadcast('session/changed') })
          }
        >
          <LogOut className="size-4" />
          {t('extension.nav.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
