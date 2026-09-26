import { Alert, AlertDescription, Button } from '@flama/design-system-web';
import { toCreateOrganizationDto } from '@flama/frontend-consumer';
import {
  useAcceptInvitation,
  useCreateOrganization,
  useMyInvitations,
  useOrganizations,
} from '@flama/frontend-consumer/organizations';
import { useLogout } from '@flama/frontend-core/react';
import {
  AuthDivider,
  AuthEyebrow,
  AuthSubtitle,
  AuthTitle,
  useErrorMessage,
} from '@flama/frontend-web';
import { Navigate, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { CreateOrganizationForm } from '@/features/organizations/forms/create-organization-form';

/**
 * Where a signed-in account with no workspace starts.
 *
 * Registering creates an account, not a tenancy. An account belongs nowhere
 * until it makes a workspace or an invitation puts it in one, so this screen
 * offers both: the invitations already addressed to this account, and a form
 * that creates a first organization and makes the caller its owner. The
 * product shell reads organization-scoped data on every screen, so sending a
 * new account there instead is how the first screen after signing up came to
 * be "You do not have permission to do that".
 *
 * It is the body of the auth layout's column, like the sign-in screens beside
 * it: `AuthLayout` owns the wordmark, the theme toggle and the measure.
 */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resolveError = useErrorMessage();
  const organizations = useOrganizations();
  const invitations = useMyInvitations();
  const accept = useAcceptInvitation({ onSuccess: () => navigate({ to: '/dashboard' }) });
  const create = useCreateOrganization({ onSuccess: () => navigate({ to: '/dashboard' }) });
  const logout = useLogout({ onSuccess: () => navigate({ to: '/login' }) });

  // Somebody who already has a workspace has no business here — they arrive by
  // typing the URL, or by having accepted an invitation in another tab.
  if (organizations.data && organizations.data.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  const pending = invitations.data ?? [];
  const busy = accept.isPending || create.isPending;
  const error = accept.error ?? create.error;

  return (
    <>
      <AuthEyebrow>{t('onboarding.eyebrow')}</AuthEyebrow>
      <AuthTitle>{t('onboarding.title')}</AuthTitle>
      <AuthSubtitle>{t('onboarding.description')}</AuthSubtitle>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{resolveError(error).message}</AlertDescription>
        </Alert>
      )}

      {pending.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {pending.map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle p-3.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-base font-medium text-ink-900">
                    {t('onboarding.invitation.title')}
                  </div>
                  <div className="mt-px truncate text-xs text-ink-400">
                    {t('onboarding.invitation.role', { role: invitation.organizationRole })}
                  </div>
                </div>
                <Button size="sm" disabled={busy} onClick={() => accept.mutate(invitation.id)}>
                  {accept.isPending
                    ? t('onboarding.invitation.joining')
                    : t('onboarding.invitation.join')}
                </Button>
              </li>
            ))}
          </ul>
          <AuthDivider label={t('common.or')} />
        </>
      )}

      <CreateOrganizationForm
        disabled={busy}
        isPending={create.isPending}
        onSubmit={({ name }) => create.mutate(toCreateOrganizationDto(name))}
      />

      <Button
        variant="secondary"
        className="mt-7 w-fit self-start"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {t('onboarding.signOut')}
      </Button>
    </>
  );
}
