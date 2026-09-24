# Templates

Code shapes to copy, using a `things` module in the consumer product. Each one
is lifted from the reference feature named in its heading. When in doubt, open
that file: the templates follow it, not the other way round.

## Contents

1. Entity and errors (`consumer/src/modules/api-tokens/`)
2. Repository, service, module, tokens, `ConsumerApp`
3. Query hooks and the key ladder (`consumer/src/react/organizations.queries.ts`)
4. Route file (`apps/web/src/routes/_authenticated/settings/api-tokens.tsx`)
5. Screen and section (`features/api-tokens/screens/`, `sections/token-table.tsx`)
6. Confirm dialog opened from a row (`features/api-tokens/dialogs/revoke-token.tsx`)
7. Form, web and mobile (`features/organizations/forms/`, `apps/mobile/features/auth/forms/`)
8. Leaf subscription (`features/api-tokens/components/permission-group-row.tsx`)
9. E2E spec (`e2e/tests/web/api-tokens.spec.ts`)
10. Render-budget spec (`packages/frontend/web/src/table/components/data-table-render.spec.tsx`)

---

## 1. Entity and errors

```ts
// packages/frontend/consumer/src/modules/things/thing.entity.ts
/** A thing as the UI needs it. Derived state is a getter, not a field. */
export class ThingEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly archivedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  get status(): 'active' | 'archived' {
    return this.archivedAt ? 'archived' : 'active';
  }
}
```

```ts
// things.errors.ts: client fallbacks only; the server's problem document wins
import type { ErrorDefinition } from '@flama/frontend-core';

export const ThingsErrors = {
  FETCH_LIST_FAILED: { code: 'THINGS_CLIENT_001', message: 'Failed to load things' },
  CREATE_FAILED: { code: 'THINGS_CLIENT_002', message: 'Failed to create the thing' },
} as const satisfies Record<string, ErrorDefinition>;
```

## 2. Repository, service, module, tokens

```ts
// things.repository.ts
import { type ThingResponseDto, ThingsApi } from '@flama/api-client';
import { AppError, MapApiError } from '@flama/frontend-core';
import { injectable } from 'inversify';
import { ThingEntity } from './thing.entity';
import { ThingsErrors } from './things.errors';

function toEntity(data: ThingResponseDto): ThingEntity {
  return new ThingEntity(
    data.id,
    data.name,
    data.archivedAt ? new Date(data.archivedAt) : null,
    new Date(data.createdAt),
  );
}

@injectable()
export class ThingsRepository {
  @MapApiError(ThingsErrors.FETCH_LIST_FAILED)
  async findAll(filters: ThingFilters = {}): Promise<ThingEntity[]> {
    const result = await ThingsApi.findAll({ query: filters });
    if (!result) throw new AppError(ThingsErrors.FETCH_LIST_FAILED);
    return result.map(toEntity);
  }
}
```

```ts
// things.service.ts: the use cases; inject the repository by token
@injectable()
export class ThingsService {
  constructor(@inject(TOKENS.ThingsRepository) private readonly repository: ThingsRepository) {}
  findAll(filters?: ThingFilters) { return this.repository.findAll(filters); }
}

// things.module.ts
export const ThingsModule = new ContainerModule(({ bind }) => {
  bind(TOKENS.ThingsRepository).to(ThingsRepository).inSingletonScope();
  bind(TOKENS.ThingsService).to(ThingsService).inSingletonScope();
});
```

Then:

- `src/di/tokens.ts`: `ThingsRepository` and `ThingsService` symbols.
- `src/di/consumer-app.ts`: push `ThingsModule` into `consumerModules`, and
  add `get things(): ThingsService`.
- `src/modules/things/index.ts`, plus `export * from './things'` in
  `src/modules/index.ts`.

## 3. Query hooks and the key ladder

```ts
// packages/frontend/consumer/src/react/things.queries.ts
'use client';

import { type HookMutationOptions, withCacheOnSuccess } from '@flama/frontend-core/react';
import type { CreateThingDto } from '@flama/shared/schemas/thing';
import { skipToken, type UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ThingEntity } from '../modules/things/thing.entity';
import type { ThingFilters } from '../modules/things/things.repository';
import { useConsumerApp } from './context';

/**
 * One function per level. Filters are appended only when a facet is set, so
 * `list()` stays a prefix of every narrowed list and one invalidation reaches
 * them all.
 */
export const thingsKeys = {
  all: ['things'] as const,
  lists: () => [...thingsKeys.all, 'list'] as const,
  list: (filters?: ThingFilters) => {
    const narrowed: ThingFilters = {};
    if (filters?.search) narrowed.search = filters.search;
    return [...thingsKeys.lists(), ...(Object.keys(narrowed).length ? [narrowed] : [])] as const;
  },
  details: () => [...thingsKeys.all, 'detail'] as const,
  detail: (id: string | undefined) => [...thingsKeys.details(), id] as const,
};

export function useThings(
  filters?: ThingFilters,
  options?: Omit<UseQueryOptions<ThingEntity[], Error>, 'queryKey' | 'queryFn'>,
) {
  const app = useConsumerApp();
  return useQuery({
    queryKey: thingsKeys.list(filters),
    queryFn: () => app.things.findAll(filters),
    ...options,
  });
}

export function useThing(id: string | undefined) {
  const app = useConsumerApp();
  return useQuery({
    queryKey: thingsKeys.detail(id),
    // skipToken, never `enabled`: the input stays in the key and the queryFn needs no `!`.
    queryFn: id ? () => app.things.findOne(id) : skipToken,
  });
}

export function useCreateThing(options?: HookMutationOptions<ThingEntity, Error, CreateThingDto>) {
  const app = useConsumerApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateThingDto) => app.things.create(dto),
    // The hook's cache write runs first; the caller's onSuccess after it.
    ...withCacheOnSuccess(options, (created) => {
      queryClient.setQueryData(thingsKeys.detail(created.id), created);
      return queryClient.invalidateQueries({ queryKey: thingsKeys.lists() });
    }),
  });
}
```

Export the keys and hooks by name from `src/react/index.ts`, then rebuild
(`pnpm turbo run build --filter @flama/frontend-consumer`) before the app
typechecks against them.

## 4. Route file (web)

```tsx
// apps/web/src/routes/_authenticated/things.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ThingsScreen } from '@/features/things/screens/things';

export const Route = createFileRoute('/_authenticated/things')({
  component: ThingsPage,
});

function ThingsPage() {
  return <ThingsScreen />;
}
```

- A route outside `_authenticated` that needs a session:
  `beforeLoad: ({ context, location }) => redirectSignedOut({ context, location })`.
- A `validateSearch` returns `{ ...rest, section }`, carrying unknown keys
  through so a table's `?things_page=` survives.

## 5. Screen and section

```tsx
// features/things/screens/things.tsx: composes, never subscribes for a child
export function ThingsScreen() {
  const { t } = useTranslation();
  return (
    <>
      <PageHead title={t('things.title')} sub={t('things.description')} />
      <div className="flex flex-col gap-4">
        <CreateThingCard />
        <ThingTable />
      </div>
    </>
  );
}
```

```tsx
// features/things/sections/thing-table.tsx: asks for what it draws
export function ThingTable() {
  const { t } = useTranslation();
  const locale = useLocale();
  const query = useTableQuery({ prefix: 'things' });
  const things = useThings({ search: query.search });
  const page = paginateRows(things.data ?? [], THING_PAGE_SIZE, query);
  // Held here, not in the dialog: it opens from a row menu that unmounts on close.
  const [archiving, setArchiving] = useState<ThingEntity | null>(null);

  const columns: DataTableColumn<ThingEntity>[] = [
    { key: 'name', label: t('things.name'), render: (thing) => thing.name },
    {
      key: 'created',
      label: t('things.created'),
      render: (thing) => formatMediumDate(thing.createdAt, locale),
    },
    {
      key: 'status',
      label: t('things.status'),
      render: (thing) => <ThingStatusBadge status={thing.status} />,
    },
  ];

  return (
    <section>
      <GroupHeading description={t('things.listDescription')}>{t('things.list')}</GroupHeading>
      <DataTable
        columns={columns}
        rows={page.rows}
        pagination={page.pagination}
        getKey={(thing) => thing.id}
        isLoading={things.isLoading}
        emptyLabel={t('things.empty')}
        rowActions={(thing) =>
          thing.status === 'active' ? (
            <DropdownMenuItem variant="destructive" onClick={() => setArchiving(thing)}>
              {t('things.archive')}
            </DropdownMenuItem>
          ) : null
        }
      />
      {archiving && <ArchiveThingDialog thing={archiving} onClose={() => setArchiving(null)} />}
    </section>
  );
}
```

## 6. Confirm dialog opened from a row

```tsx
// features/things/dialogs/archive-thing.tsx
export function ArchiveThingDialog({ thing, onClose }: { thing: ThingEntity; onClose: () => void }) {
  const { t } = useTranslation();
  const archive = useArchiveThing({ onSuccess: onClose });

  return (
    <ConfirmDialog
      title={t('things.archiveTitle', { name: thing.name })}
      description={t('things.archiveDescription')}
      confirmLabel={t('things.archive')}
      pending={archive.isPending}
      error={archive.error}
      onClose={onClose}
      onConfirm={() => archive.mutate(thing.id)}
    />
  );
}
```

## 7. Form

Web:

```tsx
// features/things/forms/thing-form.tsx: props in, onSubmit out, never fetches
export function ThingForm({
  thing,
  isPending,
  error,
  onSubmit,
}: {
  thing?: ThingEntity;
  isPending: boolean;
  error?: string;
  onSubmit: (values: UpdateThingDto) => void;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateThingDto>({
    resolver: useZodResolver(updateThingSchema),
    // `values`, not defaultValues plus an effect: the form follows the record.
    values: { name: thing?.name ?? '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="thing-name">{t('things.name')}</FieldLabel>
          <Input {...register('name')} id="thing-name" aria-invalid={Boolean(errors.name)} />
          <FieldDescription>{t('things.nameHint')}</FieldDescription>
          <FieldError errors={[errors.name]} />
        </Field>
        <Button type="submit" disabled={isPending}>
          {isPending ? t('common.saving') : t('common.save')}
        </Button>
      </FieldGroup>
    </form>
  );
}
```

- The schema comes from `@flama/shared/schemas/<area>`, a subpath. In
  `apps/web` that is required, and a new subpath also needs
  `optimizeDeps.include` in `vite.config.ts`.
- The section above resolves the failure:
  `error={mutation.error ? resolveError(mutation.error).message : undefined}`,
  with `resolveError = useErrorMessage()`.

Mobile: a `Controller` per field.

```tsx
<Controller
  control={control}
  name="name"
  render={({ field, fieldState }) => (
    <FormField label={t('things.name')} nativeID="thingName" error={fieldState.error?.message}>
      <Input
        aria-labelledby="thingName"
        value={field.value}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
      />
    </FormField>
  )}
/>
<Button onPress={handleSubmit(onSubmit)} disabled={isPending}>
  <Text>{t('common.save')}</Text>
</Button>
```

## 8. Leaf subscription

```tsx
// components/thing-preview.tsx: re-renders on its own fields, not the form's
export function ThingPreview({ control }: { control: Control<UpdateThingDto> }) {
  const name = useWatch({ control, name: 'name' });
  return <span className="text-ink-900">{name}</span>;
}
```

The form renders `<ThingPreview control={control} />` and never calls
`watch()` for it.

## 9. E2E spec (web)

```ts
// e2e/tests/web/things.spec.ts
import { expect, test } from '@playwright/test';
import { clickRowAction, provisionedUser, reloadFromServer, signInAs } from '../../support/web';

test('creates a thing, keeps it across a reload, and archives it after confirming', async ({ page }) => {
  const { user, api } = await provisionedUser('things');
  await signInAs(page, user);
  await page.goto('/things');

  // Unique per run: archived rows stay listed.
  const name = `e2e thing ${Date.now()}`;
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  await reloadFromServer(page);
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toBeVisible({ timeout: 20_000 });

  await clickRowAction(page, row, 'Archive');
  await page.getByRole('dialog').getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(row.getByText('Archived')).toBeVisible();

  await api.dispose();
});
```

- Each spec creates what it asserts on (`provisionedUser`). No seeded rows.
- Reload before you assert on persistence, so the value comes from the
  server rather than the cache the mutation wrote.

## 10. Render-budget spec

For a component whose cost is the point. The name ends in
`-render.spec.tsx`, so it runs with the React Compiler **off**:

```tsx
// features/things/__tests__/thing-table-render.spec.tsx
it('a keystroke in the search renders no rows', async () => {
  const renders = countRenders(ThingRow); // see data-table-render.spec.tsx for the harness
  await user.type(screen.getByRole('searchbox'), 'abc');
  expect(renders.count).toBe(0);
});
```

Write the harness so the value feeds back the way the real caller feeds it.
Otherwise the test passes on the very shape it was meant to forbid.
