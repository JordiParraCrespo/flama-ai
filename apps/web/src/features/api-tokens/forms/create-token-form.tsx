import {
  Alert,
  AlertDescription,
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
} from '@flama/design-system-web';
import type { PermissionGroup, Scope } from '@flama/shared';
import { type ReactNode, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PermissionField } from '@/features/api-tokens/components/permission-field';
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

/**
 * The full-page "create a token" form: name, permissions, lifetime, and the
 * fields another feature adds as `children` — they read the form from its
 * context, the way organizations adds the workspaces a token is restricted to.
 */
export function CreateTokenForm({
  groups,
  grantable,
  loadingCatalog,
  isPending,
  error,
  onSubmit,
  children,
}: {
  groups: readonly PermissionGroup[];
  grantable: Scope[];
  loadingCatalog: boolean;
  isPending: boolean;
  /** The resolved failure message, if the last attempt failed. */
  error?: string;
  /** Resolves once the token is created; rejects when the request fails. */
  onSubmit: (values: CreateTokenFormValues) => Promise<void>;
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  const form = useForm<TokenFormFields>({ defaultValues: EMPTY_TOKEN_FORM });
  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = form;

  const [permissionsMessage, setPermissionsMessage] = useState<string>();

  /**
   * The cross-row rule: a token with no scopes can call nothing.
   *
   * Held here rather than on the field because React Hook Form validation
   * descends past `permissions` to the rows registered under it: neither a rule
   * nor a `setError` on the parent path survives. It runs from both arms of
   * `handleSubmit`, so an empty form reports this *and* the missing name in one
   * pass, the way a field rule would have. `PermissionField` stops showing it
   * the moment a row is granted.
   */
  const permissionsGranted = () => {
    if (hasAnyScope(getValues('permissions'))) {
      setPermissionsMessage(undefined);
      return true;
    }
    setPermissionsMessage(t('apiTokens.permissionsRequired'));
    return false;
  };

  const submit = handleSubmit(async (values) => {
    if (!permissionsGranted()) return;

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
  }, permissionsGranted);

  return (
    <FormProvider {...form}>
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

          <PermissionField
            control={control}
            name="permissions"
            label={t('apiTokens.permissions')}
            hint={t('apiTokens.permissionsHint')}
            message={permissionsMessage}
          >
            {loadingCatalog ? (
              <div className="flex flex-col gap-2" aria-busy="true">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <PermissionPicker
                groups={groups}
                grantable={grantable}
                control={control}
                name="permissions"
                disabled={isPending}
              />
            )}
          </PermissionField>

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
                        {days === null
                          ? t('apiTokens.never')
                          : t('apiTokens.days', { count: days })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          {children}

          <Separator />

          <Button type="submit" disabled={isPending}>
            {isPending ? t('common.loading') : t('apiTokens.createButton')}
          </Button>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
