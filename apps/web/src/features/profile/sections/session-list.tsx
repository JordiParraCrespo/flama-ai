import { Alert, AlertDescription, Button, EmptyState, Skeleton } from '@flama/design-system-web';
import { LogOut } from '@flama/design-system-web/icons';
import type { UserSessionEntity } from '@flama/frontend-consumer';
import { useProfileSessions } from '@flama/frontend-consumer/react';
import { SectionCard, useErrorMessage } from '@flama/frontend-web';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionRow } from '@/features/profile/components/session-row';
import { RevokeOtherSessionsDialog } from '@/features/profile/dialogs/revoke-other-sessions';
import { RevokeSessionDialog } from '@/features/profile/dialogs/revoke-session';

/**
 * The reader's own live sign-ins, with a way to end any of them — the one
 * session list, drawn by both the profile's Sessions pane and the workspace
 * settings' Security pane.
 *
 * `/v1/profile/sessions` scopes the list to the caller, so this is every device
 * *you* are signed in on, not the whole workspace's.
 *
 * Which session is being signed out is held here rather than in the row: the
 * dialog owns the revoke, and the list is the one place both can reach.
 */
export function SessionList() {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const sessions = useProfileSessions();
  const [revoking, setRevoking] = useState<UserSessionEntity | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const hasOthers = (sessions.data ?? []).some((session) => !session.current);

  return (
    <>
      {sessions.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{resolveError(sessions.error).message}</AlertDescription>
        </Alert>
      )}

      <SectionCard className="mb-4.5">
        {sessions.isPending && (
          <div className="flex flex-col gap-3 p-4.5">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
        )}
        {sessions.data?.length === 0 && (
          <EmptyState className="py-8">
            <EmptyState.Header>
              <EmptyState.Title>{t('profile.sessions.empty')}</EmptyState.Title>
            </EmptyState.Header>
          </EmptyState>
        )}
        {sessions.data?.map((session) => (
          <SessionRow key={session.id} session={session} onSignOut={() => setRevoking(session)} />
        ))}
      </SectionCard>

      {/*
        Says what "Sign out" does not do. The list is devices only — the
        sessions minted for an API key or a connected app are filtered out
        server-side — so without this line the screen reads as the place where
        every kind of access is ended, and someone rotating a leaked key would
        stop here believing they had.
      */}
      <p className="mb-4.5 text-xs text-ink-400">{t('profile.sessions.credentialsNote')}</p>

      <Button
        variant="secondary"
        size="sm"
        disabled={!hasOthers}
        onClick={() => setRevokingOthers(true)}
      >
        <LogOut data-icon="inline-start" />
        {t('profile.sessions.signOutAll')}
      </Button>

      {revoking && <RevokeSessionDialog session={revoking} onClose={() => setRevoking(null)} />}
      {revokingOthers && <RevokeOtherSessionsDialog onClose={() => setRevokingOthers(false)} />}
    </>
  );
}
