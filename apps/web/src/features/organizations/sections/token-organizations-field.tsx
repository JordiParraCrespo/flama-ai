import { Checkbox, Field, FieldDescription, FieldLabel, Label } from '@flama/design-system-web';
import { useOrganizations } from '@flama/frontend-consumer/organizations';
import { useController, useFormState } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/** The part of the create-token form this field owns. */
type RestrictedToken = { organizationIds: string[] };

/**
 * The organizations a new API token may be restricted to, as a field of the
 * create-token form: it reads the form from its context, so the API-tokens
 * feature knows nothing of organizations. Nothing to restrict to, nothing shown.
 */
export function TokenOrganizationsField() {
  const { t } = useTranslation();
  const organizations = useOrganizations().data ?? [];
  const { field } = useController<RestrictedToken, 'organizationIds'>({
    name: 'organizationIds',
  });
  const { isSubmitting } = useFormState();

  if (organizations.length === 0) return null;
  return (
    <Field>
      <FieldLabel>{t('apiTokens.organizations')}</FieldLabel>
      <FieldDescription>{t('apiTokens.organizationsHint')}</FieldDescription>
      <div className="flex flex-col gap-2">
        {organizations.map((organization) => (
          <div key={organization.id} className="flex items-center gap-2">
            <Checkbox
              id={`org-${organization.id}`}
              checked={field.value.includes(organization.id)}
              onCheckedChange={(checked) =>
                field.onChange(
                  checked
                    ? [...field.value, organization.id]
                    : field.value.filter((id) => id !== organization.id),
                )
              }
              disabled={isSubmitting}
            />
            <Label htmlFor={`org-${organization.id}`} className="cursor-pointer text-sm">
              {organization.name}
            </Label>
          </div>
        ))}
      </div>
    </Field>
  );
}
