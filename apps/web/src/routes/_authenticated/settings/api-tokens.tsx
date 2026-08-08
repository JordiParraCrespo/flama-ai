import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@flama/design-system-web';
import type { ApiTokenEntity } from '@flama/frontend';
import {
  useApiTokens,
  useCreateApiToken,
  useOrganizations,
  usePermissionCatalog,
  useRevokeApiToken,
} from '@flama/frontend/react';
import type { Scope } from '@flama/shared';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PermissionPicker } from '@/components/permission-picker';
import { useErrorMessage } from '@/lib/use-error-message';

export const Route = createFileRoute('/_authenticated/settings/api-tokens')({
  component: ApiTokensPage,
});

/** Lifetimes offered in the form, in days. `null` means "does not expire". */
const LIFETIMES: (number | null)[] = [7, 30, 90, 365, null];

/**
 * Mirrors `CreateApiTokenDto` minus the fields this form does not expose.
 * Declared locally rather than derived from `createApiTokenSchema`, which would
 * pull the scope catalog into the bundle — the page fetches it from the API.
 */
type CreateTokenFormValues = {
  name: string;
  scopes: Scope[];
  expiresInDays: number | null;
  organizationIds: string[];
};

const EMPTY_TOKEN_FORM: CreateTokenFormValues = {
  name: '',
  scopes: [],
  expiresInDays: 90,
  organizationIds: [],
};

function ApiTokensPage() {
  const { t } = useTranslation();
  const tokens = useApiTokens();
  const catalog = usePermissionCatalog();
  const [secret, setSecret] = useState<string | null>(null);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('apiTokens.title')}</h1>
        <p className="text-muted-foreground">{t('apiTokens.description')}</p>
      </div>

      {secret && <SecretPanel secret={secret} onDismiss={() => setSecret(null)} />}

      <CreateTokenCard
        grantable={catalog.data?.grantable ?? []}
        groups={catalog.data?.groups ?? []}
        loadingCatalog={catalog.isLoading}
        onCreated={setSecret}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('apiTokens.yourTokens')}</CardTitle>
          <CardDescription>{t('apiTokens.yourTokensDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {tokens.isLoading && (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          )}
          {tokens.data && <TokenTable tokens={tokens.data} />}
        </CardContent>
      </Card>
    </>
  );
}

/**
 * The one and only time the secret exists outside the server. Deliberately
 * loud, and dismissed only by an explicit click.
 */
function SecretPanel({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
  }

  return (
    <Alert>
      <AlertTitle>{t('apiTokens.created')}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{t('apiTokens.shownOnce')}</span>
        <code className="block overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-sm">
          {secret}
        </code>
        <span className="flex gap-2">
          <Button type="button" size="sm" onClick={copy}>
            {copied ? t('apiTokens.copied') : t('apiTokens.copy')}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
            {t('apiTokens.dismiss')}
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}

function CreateTokenCard({
  groups,
  grantable,
  loadingCatalog,
  onCreated,
}: {
  groups: Parameters<typeof PermissionPicker>[0]['groups'];
  grantable: Scope[];
  loadingCatalog: boolean;
  onCreated: (secret: string) => void;
}) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const organizations = useOrganizations();
  const create = useCreateApiToken();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTokenFormValues>({ defaultValues: EMPTY_TOKEN_FORM });

  const onSubmit = handleSubmit(({ name, scopes, expiresInDays, organizationIds }) => {
    create.mutate(
      {
        name,
        scopes,
        expiresInDays,
        organizationIds: organizationIds.length > 0 ? organizationIds : undefined,
      },
      {
        onSuccess: ({ secret }) => {
          onCreated(secret);
          reset(EMPTY_TOKEN_FORM);
        },
      },
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('apiTokens.create')}</CardTitle>
        <CardDescription>{t('apiTokens.createDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {create.error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {resolveError(create.error).message}
              </div>
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
                disabled={create.isPending}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Controller
              control={control}
              name="scopes"
              rules={{
                validate: (value) => value.length > 0 || t('apiTokens.permissionsRequired'),
              }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t('apiTokens.permissions')}</FieldLabel>
                  {loadingCatalog ? (
                    <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                  ) : (
                    <PermissionPicker
                      groups={groups}
                      grantable={grantable}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={create.isPending}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">{t('apiTokens.permissionsHint')}</p>
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
                    disabled={create.isPending}
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

            {organizations.data && organizations.data.length > 0 && (
              <Controller
                control={control}
                name="organizationIds"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{t('apiTokens.organizations')}</FieldLabel>
                    <p className="text-xs text-muted-foreground">
                      {t('apiTokens.organizationsHint')}
                    </p>
                    <div className="flex flex-col gap-2">
                      {organizations.data.map((organization) => (
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
                            disabled={create.isPending}
                          />
                          <Label
                            htmlFor={`org-${organization.id}`}
                            className="cursor-pointer text-sm"
                          >
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

            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t('common.loading') : t('apiTokens.createButton')}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function TokenTable({ tokens }: { tokens: ApiTokenEntity[] }) {
  const { t } = useTranslation();
  const revoke = useRevokeApiToken();

  if (tokens.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('apiTokens.empty')}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('apiTokens.name')}</TableHead>
          <TableHead>{t('apiTokens.prefix')}</TableHead>
          <TableHead>{t('apiTokens.permissions')}</TableHead>
          <TableHead>{t('apiTokens.status')}</TableHead>
          <TableHead>{t('apiTokens.lastUsed')}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokens.map((token) => (
          <TableRow key={token.id}>
            <TableCell className="font-medium">{token.name}</TableCell>
            <TableCell className="font-mono text-xs">{token.prefix}…</TableCell>
            <TableCell className="max-w-xs">
              <span className="flex flex-wrap gap-1">
                {token.scopes.map((scope) => (
                  <Badge key={scope} variant="secondary" className="font-mono text-xs">
                    {scope}
                  </Badge>
                ))}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge status={token.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {token.lastUsedAt ? token.lastUsedAt.toLocaleDateString() : t('apiTokens.neverUsed')}
            </TableCell>
            <TableCell className="text-right">
              {token.isActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(token.id)}
                >
                  {t('apiTokens.revoke')}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusBadge({ status }: { status: ApiTokenEntity['status'] }) {
  const { t } = useTranslation();

  if (status === 'revoked') return <Badge variant="destructive">{t('apiTokens.revoked')}</Badge>;
  if (status === 'expired') return <Badge variant="outline">{t('apiTokens.expired')}</Badge>;
  return <Badge variant="secondary">{t('apiTokens.active')}</Badge>;
}
