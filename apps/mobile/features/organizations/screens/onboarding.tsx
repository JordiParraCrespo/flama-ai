import { toCreateOrganizationDto } from '@flama/frontend-consumer';
import {
  useAcceptInvitation,
  useCreateOrganization,
  useMyInvitations,
  useOrganizations,
} from '@flama/frontend-consumer/organizations';
import { useErrorMessage } from '@flama/frontend-core/react';
import {
  AuthDivider,
  AuthFormError,
  AuthLayout,
  AuthSubtitle,
  AuthTitle,
  SignOutButton,
} from '@flama/frontend-mobile';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { InvitationRow } from '../components/invitation-row';
import { CreateOrganizationForm } from '../forms/create-organization-form';

/**
 * Where a signed-in account with no workspace starts — the mobile twin of the
 * web onboarding screen.
 *
 * Registering creates an account, not a tenancy, and every screen in `(app)`
 * reads organization-scoped data. So this offers the invitations already
 * addressed to the account and a form that creates a first organization.
 */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const resolveError = useErrorMessage();
  const organizations = useOrganizations();
  const invitations = useMyInvitations();
  const toApp = () => router.replace('/(app)');
  const accept = useAcceptInvitation({ onSuccess: toApp });
  const create = useCreateOrganization({ onSuccess: toApp });

  // Somebody who already has a workspace has no business here.
  if (organizations.data && organizations.data.length > 0) {
    return <Redirect href="/(app)" />;
  }

  const pending = invitations.data ?? [];
  const busy = accept.isPending || create.isPending;
  const error = accept.error ?? create.error;

  return (
    <AuthLayout>
      <AuthTitle>{t('onboarding.title')}</AuthTitle>
      <AuthSubtitle>{t('onboarding.description')}</AuthSubtitle>

      {error ? <AuthFormError>{resolveError(error).message}</AuthFormError> : null}

      {pending.length > 0 ? (
        <>
          <View className="gap-3">
            {pending.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                role={invitation.organizationRole}
                disabled={busy}
                joining={accept.isPending && accept.variables === invitation.id}
                onJoin={() => accept.mutate(invitation.id)}
              />
            ))}
          </View>
          <AuthDivider label={t('common.or')} />
        </>
      ) : null}

      <CreateOrganizationForm
        disabled={busy}
        isPending={create.isPending}
        onSubmit={({ name }) => create.mutate(toCreateOrganizationDto(name))}
      />

      <SignOutButton
        variant="secondary"
        className="mt-7 self-start"
        loginHref="/(auth)/login"
        label={t('onboarding.signOut')}
      />
    </AuthLayout>
  );
}
