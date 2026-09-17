import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@flama/design-system-web';
import type { OrganizationEntity } from '@flama/frontend-consumer';
import type { PermissionGroup, Scope } from '@flama/shared';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PermissionPicker } from '@/features/api-tokens/components/permission-picker';
import {
  hasAnyScope,
  type ScopeSelection,
  scopesFromSelection,
} from '@/features/api-tokens/lib/scope-selection';
import { LIFETIMES } from '@/features/api-tokens/lib/token-status';

/**
 * Mirrors `CreateApiTokenDto` minus the fields this form does not expose.
 * Declared locally rather than derived from `createApiTokenSchema`, which would
 * pull the scope catalog into the bundle — the page fetches it from the API.
 */
export type CreateTokenFormValues = {
  name: string;
  scopes: Scope[];
  expiresInDays: number | null;
  organizationIds: string[];
};

/**
 * What the fields hold. Permissions are per resource here and flattened to the
 * `Scope[]` the API takes on submit — see `lib/scope-selection.ts` for why.
 *
 * `permissions` starts empty and fills in as the rows mount, each registering
 * its own `none`: the catalog is fetched, so there is nothing to seed from
 * until it lands, and a row that has not rendered has granted nothing.
 */
type TokenFormFields = {
  name: string;
  permissions: ScopeSelection;
  expiresInDays: number | null;
  organizationIds: string[];
};

const EMPTY_TOKEN_FORM: TokenFormFields = {
  name: '',
  permissions: {},
  expiresInDays: 90,
  organizationIds: [],
};

/** The full-page "create a token" form: name, permissions, lifetime, workspaces. */
export function CreateTokenForm({
  groups,
  grantable,
  loadingCatalog,
  organizations,
  isPending,
  error,
  onSubmit,
}: {
  groups: readonly PermissionGroup[];
  grantable: Scope[];
  loadingCatalog: boolean;
  organizations: OrganizationEntity[];
  isPending: boolean;
  /** The resolved failure message, if the last attempt failed. */
  error?: string;
  /** Resolves once the token is created; rejects when the request fails. */
  onSubmit: (values: CreateTokenFormValues) => Promise<void>;
}) {
  const { t } = useTranslation();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TokenFormFields>({ defaultValues: EMPTY_TOKEN_FORM });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({
        name: values.name,
        scopes: scopesFromSelection(groups, values.permissions),
        expiresInDays: values.expiresInDays,
        organizationIds: values.organizationIds,
      });
    } catch {
      // The failure is shown above the fields; the draft stays for another try.
      return;
    }
    reset(EMPTY_TOKEN_FORM);
  });

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="token-name">{t('apiTokens.name')}</FieldLabel>
          <Input
            {...register('name', {
              required: t('validation.required'),
              maxLength: {
                value: 80,
                message: t('validation.maxLength', { max: 80 }),
              },
            })}
            id="token-name"
            placeholder={t('apiTokens.namePlaceholder')}
            maxLength={80}
            aria-invalid={Boolean(errors.name)}
            disabled={isPending}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Controller
          control={control}
          name="permissions"
          rules={{ validate: (value) => hasAnyScope(value) || t('apiTokens.permissionsRequired') }}
          // Rendered through a `Controller` for the validation and the error
          // only: the picker writes through `control`, one field per row, so
          // this never re-renders on a click.
          render={({ fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('apiTokens.permissions')}</FieldLabel>
              {loadingCatalog ? (
                <p className="text-sm text-ink-600">{t('common.loading')}</p>
              ) : (
                <PermissionPicker
                  groups={groups}
                  grantable={grantable}
                  control={control}
                  name="permissions"
                  disabled={isPending}
                />
              )}
              <p className="text-xs text-ink-600">{t('apiTokens.permissionsHint')}</p>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={control}
          name="expiresInDays"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="token-expiry">{t('apiTokens.expiry')}</FieldLabel>
              <Select
                value={String(field.value)}
                onValueChange={(next) => field.onChange(next === 'null' ? null : Number(next))}
                disabled={isPending}
              >
                <SelectTrigger id="token-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIFETIMES.map((days) => (
                    <SelectItem key={String(days)} value={String(days)}>
                      {days === null ? t('apiTokens.never') : t('apiTokens.days', { count: days })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        {organizations.length > 0 && (
          <Controller
            control={control}
            name="organizationIds"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t('apiTokens.organizations')}</FieldLabel>
                <p className="text-xs text-ink-600">{t('apiTokens.organizationsHint')}</p>
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
                        disabled={isPending}
                      />
                      <Label htmlFor={`org-${organization.id}`} className="cursor-pointer text-sm">
                        {organization.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </Field>
            )}
          />
        )}

        <Separator />

        <Button type="submit" disabled={isPending}>
          {isPending ? t('common.loading') : t('apiTokens.createButton')}
        </Button>
      </FieldGroup>
    </form>
  );
}
