import { Badge, Button } from '@flama/design-system-web';
import { Monitor, Smartphone } from '@flama/design-system-web/icons';
import type { UserSessionEntity } from '@flama/frontend-consumer';
import {
  formatRelativeTime,
  RowControl,
  RowMedia,
  RowMeta,
  SectionRow,
  useLocale,
} from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';

/**
 * One signed-in device. Signing it out only asks: the confirm dialog owns the
 * revoke, so one row's request in flight leaves the others usable.
 */
export function SessionRow({
  session,
  onSignOut,
}: {
  session: UserSessionEntity;
  onSignOut: () => void;
}) {
  const { t } = useTranslation();
  const locale = useLocale();

  const DeviceIcon = session.deviceKind === 'mobile' ? Smartphone : Monitor;
  const lastSeen =
    formatRelativeTime(session.lastSeenAt, locale) ?? t('profile.sessions.activeNow');

  return (
    <SectionRow className="py-3.5">
      <RowMedia>
        <DeviceIcon className="size-4.25 text-ink-600" />
      </RowMedia>
      <RowMeta
        name={session.deviceLabel ?? t('profile.sessions.unknownDevice')}
        description={`${session.ipAddress ?? t('profile.sessions.unknownLocation')} · ${lastSeen}`}
      />
      <RowControl>
        {session.current ? (
          <Badge variant="active">{t('profile.sessions.thisDevice')}</Badge>
        ) : (
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            {t('profile.sessions.signOut')}
          </Button>
        )}
      </RowControl>
    </SectionRow>
  );
}
