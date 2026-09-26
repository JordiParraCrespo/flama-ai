import { Button } from '@flama/design-system-web';
import {
  useAcceptInvitation,
  useAcceptInvitationAsNewcomer,
} from '@flama/frontend-consumer/organizations';
import { useAuthState } from '@flama/frontend-core/react';
import {
  AuthEyebrow,
  AuthFooterNote,
  AuthFormError,
  AuthSubtitle,
  AuthTitle,
  authControlClass,
  useErrorMessage,
} from '@flama/frontend-web';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { InviterCard } from '@/features/organizations/components/inviter-card';
import { AcceptInvitationForm } from '@/features/organizations/forms/accept-invitation-form';
import { splitName } from '@/features/organizations/lib/invitation';

export interface AcceptInvitationSearch {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  inviter?: string;
}

export function AcceptInvitationScreen({ id, email, name, role, inviter }: AcceptInvitationSearch) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resolveError = useErrorMessage();
  const { isAuthenticated } = useAuthState();

  const invitationHref = `/accept-invitation?${new URLSearchParams(
    Object.entries({ id, email, name, role, inviter }).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString()}`;

  // Both hooks refetch the workspaces before resolving, so the shell does not
  // read a cached "you belong nowhere" and bounce the reader to onboarding.
  const goToDashboard = () => navigate({ to: '/dashboard' });
  // A signed-in reader only has to accept; a signed-out one registers (or
  // signs in) first, in the same submission.
  const accept = useAcceptInvitation({ onSuccess: goToDashboard });
  const join = useAcceptInvitationAsNewcomer({ onSuccess: goToDashboard });

  const isPending = accept.isPending || join.isPending;
  const error = accept.error ?? join.error;

  const linkIsValid = Boolean(id && email);

  return (
    <>
      <AuthEyebrow>{t('auth.acceptInvitation.eyebrow')}</AuthEyebrow>
      <AuthTitle>{t('auth.acceptInvitation.title')}</AuthTitle>
      <AuthSubtitle>{t('auth.acceptInvitation.description')}</AuthSubtitle>

      {inviter && <InviterCard inviter={inviter} role={role} email={email} />}

      {/*
        Every other auth screen puts its callout inside the form's `FieldGroup`,
        which supplies the 16px gap to the control below. Here it sits outside
        the form — the accepted-invitation branch has no form at all — so the
        block owns that spacing itself, instead of leaving the alert flush
        against the CTA.
      */}
      {(!linkIsValid || error) && (
        <div className="mb-4 flex flex-col gap-3">
          {!linkIsValid && <AuthFormError>{t('auth.acceptInvitation.invalidLink')}</AuthFormError>}
          {error && (
            <AuthFormError>{resolveError(error, t('auth.register.failed')).message}</AuthFormError>
          )}
        </div>
      )}

      {isAuthenticated ? (
        <Button
          type="button"
          disabled={isPending || !linkIsValid}
          className={authControlClass}
          onClick={() => id && accept.mutate(id)}
        >
          {isPending
            ? t('auth.acceptInvitation.joining')
            : t('auth.acceptInvitation.acceptExisting')}
        </Button>
      ) : (
        <AcceptInvitationForm
          email={email}
          defaultName={name}
          isPending={isPending}
          linkIsValid={linkIsValid}
          onSubmit={({ fullName, password }) => {
            if (id && email) {
              join.mutate({ invitationId: id, email, password, ...splitName(fullName) });
            }
          }}
        />
      )}

      {!isAuthenticated && (
        <AuthFooterNote>
          {t('auth.register.hasAccount')}{' '}
          <Link
            to="/login"
            search={{ redirect: invitationHref, email }}
            className="text-accent-blue transition-opacity hover:opacity-80"
          >
            {t('auth.register.signIn')}
          </Link>
        </AuthFooterNote>
      )}
    </>
  );
}
