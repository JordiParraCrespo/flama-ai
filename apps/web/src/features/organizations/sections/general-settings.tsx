import { Alert, AlertDescription, toast } from '@flama/design-system-web';
import { useOrganizations, useUpdateOrganization } from '@flama/frontend-consumer/react';
import { SectionHead, useErrorMessage } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { OrganizationForm } from '@/features/organizations/forms/organization-form';
import type { OrganizationFormDto } from '@/features/organizations/lib/organization-form';

/** The settings pane that renames the workspace and changes its mark. */
export function GeneralSettingsSection() {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const organizations = useOrganizations();
  const organization = organizations.data?.[0];
  const update = useUpdateOrganization();

  const defaults: OrganizationFormDto = {
    name: organization?.name ?? '',
    logo: organization?.logo ?? '',
  };

  const onSubmit = async (values: OrganizationFormDto) => {
    if (!organization) return;

    // Unchanged fields are omitted rather than redundantly written; an empty
    // changed logo means "remove the mark", which the API spells `null`.
    const changes = {
      ...(values.name !== organization.name ? { name: values.name } : {}),
      ...(values.logo !== (organization.logo ?? '') ? { logo: values.logo || null } : {}),
    };

    if (Object.keys(changes).length > 0) {
      await update.mutateAsync({ id: organization.id, changes });
    }

    // Success is a toast and only a toast: an inline "saved" beside it said the
    // same thing twice.
    toast.success(t('settings.general.saveSuccess'));
  };

  return (
    <>
      <SectionHead title={t('settings.general.title')} sub={t('settings.general.description')} />

      {update.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{resolveError(update.error).message}</AlertDescription>
        </Alert>
      )}

      <OrganizationForm
        values={defaults}
        disabled={organizations.isLoading || !organization}
        isPending={update.isPending}
        // A failure belongs to the values that produced it; clear it as soon
        // as the user edits again. Wired to change handlers, not to the form's
        // values, so the cache-driven reset after a save is not an edit.
        onChange={() => update.reset()}
        onSubmit={onSubmit}
      />
    </>
  );
}
