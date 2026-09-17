import {
  Alert,
  AlertDescription,
  Button,
  DialogBody,
  DialogFooter,
  EmptyState,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  SearchInput,
} from '@flama/design-system-web';
import type { PermissionGroup, Scope } from '@flama/shared';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PermissionPicker } from '@/features/api-tokens/components/permission-picker';
import {
  hasAnyScope,
  type ScopeSelection,
  scopesFromSelection,
} from '@/features/api-tokens/lib/scope-selection';

export interface CreateApiTokenFormValues {
  name: string;
  scopes: Scope[];
}

/**
 * What the fields hold: permissions per resource, flattened to the `Scope[]`
 * the API takes on submit. See `lib/scope-selection.ts`.
 */
type ApiTokenFormFields = {
  name: string;
  permissions: ScopeSelection;
};

/**
 * The body of the "Create API key" dialog: a name and the permissions the key
 * grants. It renders the dialog's body and footer so the form element can wrap
 * both, which is what lets the footer's button submit it.
 */
export function CreateApiTokenForm({
  groups,
  grantable,
  loadingCatalog,
  isPending,
  error,
  onCancel,
  onSubmit,
}: {
  groups: readonly PermissionGroup[];
  grantable: readonly Scope[];
  loadingCatalog: boolean;
  isPending: boolean;
  /** The resolved failure message, if the last attempt failed. */
  error?: string;
  onCancel: () => void;
  onSubmit: (values: CreateApiTokenFormValues) => void;
}) {
  const { t } = useTranslation();
  const [permissionSearch, setPermissionSearch] = useState('');

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApiTokenFormFields>({ defaultValues: { name: '', permissions: {} } });

  const normalizedPermissionSearch = permissionSearch.trim().toLocaleLowerCase();
  const visiblePermissionGroups = groups.filter((group) =>
    [group.label, group.description, group.levels.read.description, group.levels.write.description]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedPermissionSearch),
  );

  return (
    <form
      id="create-api-key"
      onSubmit={handleSubmit((values) =>
        onSubmit({ name: values.name, scopes: scopesFromSelection(groups, values.permissions) }),
      )}
      noValidate
      className="flex min-h-0 flex-auto flex-col gap-5"
    >
      <DialogBody>
        <FieldGroup>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="api-key-name">{t('settings.api.keyName')}</FieldLabel>
            <Input
              {...register('name', { required: t('validation.required') })}
              id="api-key-name"
              placeholder={t('settings.api.keyNamePlaceholder')}
              maxLength={80}
              aria-invalid={Boolean(errors.name)}
              disabled={isPending}
            />
            <FieldDescription>{t('settings.api.keyNameHint')}</FieldDescription>
            <FieldError errors={[errors.name]} />
          </Field>

          <Controller
            control={control}
            name="permissions"
            rules={{ validate: (value) => hasAnyScope(value) || t('validation.required') }}
            // For the validation and the error only: the picker writes through
            // `control`, one field per row, so this does not re-render on a
            // click.
            render={({ fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t('settings.api.keyPermissions')}</FieldLabel>
                {loadingCatalog ? (
                  <p className="text-sm text-ink-600">{t('common.loading')}</p>
                ) : (
                  <>
                    <SearchInput
                      value={permissionSearch}
                      onChange={(event) => setPermissionSearch(event.target.value)}
                      placeholder={t('settings.api.searchPermissions')}
                      aria-label={t('settings.api.searchPermissions')}
                      hint={null}
                      containerClassName="w-full"
                      disabled={isPending}
                    />
                    {visiblePermissionGroups.length > 0 ? (
                      // No scroll cap of its own: the dialog body already
                      // scrolls, and a picker that scrolled inside it gave
                      // the card two scrollbars and a wheel that stopped at
                      // the picker's edge.
                      <PermissionPicker
                        groups={visiblePermissionGroups}
                        grantable={grantable}
                        control={control}
                        name="permissions"
                        disabled={isPending}
                      />
                    ) : (
                      <EmptyState className="border border-border-subtle py-6">
                        <EmptyState.Header>
                          <EmptyState.Title>
                            {t('settings.api.noPermissionResults')}
                          </EmptyState.Title>
                        </EmptyState.Header>
                      </EmptyState>
                    )}
                  </>
                )}
                <FieldDescription>{t('settings.api.keyPermissionsHint')}</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>
      </DialogBody>
      <DialogFooter className="border-t border-border-subtle pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          {t('settings.api.cancel')}
        </Button>
        <Button type="submit" disabled={isPending || loadingCatalog}>
          {t('settings.api.create')}
        </Button>
      </DialogFooter>
    </form>
  );
}
