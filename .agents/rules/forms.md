---
paths:
  - "apps/web/**/*"
  - "apps/mobile/**/*"
  - "packages/frontend/core/src/validation/**/*"
  - "packages/shared/src/schemas/**/*"
---

# Forms Rules

Every form in `apps/web` and `apps/mobile` uses **React Hook Form** validated by
a **Zod schema from `@flama/shared`**. Do not hand-roll form state: no
`useState` per field, no `new FormData(event.currentTarget)`, no `safeParse` in
a submit handler, and no relying on the browser's native `required` /
`type="email"` for validation.

The resolver always comes from the platform kit's `useZodResolver` hook
(`@flama/frontend-web` or `@flama/frontend-mobile`), never from
`zodResolver` directly — that hook is what keeps failure messages translated.

## Web (`apps/web`)

Plain inputs take `register()`. The design system's `Field` / `FieldError`
already speak React Hook Form's error shape, so no wrapper component is needed.

```tsx
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
} from "@flama/design-system-web";
import { type LoginDto, loginSchema } from "@flama/shared/schemas/auth";
import { useForm } from "react-hook-form";
import { useZodResolver } from "@flama/frontend-web";

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<LoginDto>({
  resolver: useZodResolver(loginSchema),
  defaultValues: { email: "", password: "" },
});

<form onSubmit={handleSubmit(onValid)} noValidate>
  <FieldGroup>
    <Field data-invalid={Boolean(errors.email)}>
      <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
      <Input
        {...register("email")}
        id="email"
        type="email"
        aria-invalid={Boolean(errors.email)}
      />
      <FieldError errors={[errors.email]} />
    </Field>
  </FieldGroup>
</form>;
```

- `noValidate` on the `<form>`: validation is Zod's job, and leaving the native
  layer on gives two competing sets of messages.
- `data-invalid` on the `Field` drives the destructive styling; `aria-invalid`
  on the control is what assistive tech reads. Set both.
- Anything that is not a plain input — `Select`, `Checkbox` groups, the
  `PermissionPicker` — needs a `Controller`, because there is no ref to
  register.

## Mobile (`apps/mobile`)

React Native has no DOM refs, so `register()` does not work. Every field goes
through `Controller`, wired to the mobile kit's `FormField` (label + control +
error, mirroring the web `Field`).

```tsx
<Controller
  control={control}
  name="email"
  render={({ field, fieldState }) => (
    <FormField
      label={t("auth.email")}
      nativeID="email"
      error={fieldState.error?.message}
    >
      <Input
        aria-labelledby="email"
        value={field.value}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
      />
    </FormField>
  )}
/>
```

Pass `field.onBlur` through, not just `onChange` — without it `touched` never
updates and blur-mode validation silently does nothing. Report failures inline;
do not put them in an `Alert`.

## Schemas must not carry their own messages

Zod short-circuits any error map when a check states its own message, so
`z.string().email('Invalid email address')` pins every consumer to English and
silently defeats translation. Schemas in `packages/shared/src/schemas/` state
the **constraint only**:

```ts
// Right
email: z.string().email(),
password: z.string().min(8),

// Wrong — untranslatable
email: z.string().email('Invalid email address'),
```

A `refine` has no issue code worth reading (`custom`), so it names its message
through params instead of stating one:

```ts
.refine((value) => byteLength(value) <= MAX, { params: { i18nKey: 'validation.tooLong' } })
```

The map translates the key, interpolating any other params; a `refine` that
names no key reads as `validation.invalid`. Every issue code has a case, so
nothing reaches a form in Zod's English. The one remaining exception is a
check that states its own message: Zod never asks the map about it.

## Adding a message

`createZodErrorMap` (in `@flama/frontend-core/validation`) maps a Zod issue code onto
a `validation.*` translation key. To cover a new issue code:

1. Add the case to `createZodErrorMap`.
2. Add the key to `VALIDATION_MESSAGE_KEYS` in the same file.
3. Add the message to **every** locale in `packages/translations/*/validation.json`,
   then run `pnpm --filter @flama/translations assemble` (the `index.json`
   beside it is generated).

`TranslateFn` is narrow on purpose — each app hands it a `t` typed over the
whole catalog, so a key you forget to add is a compile error rather than a raw
key rendered to a user. Skipping step 3 breaks the build; that is the point.

Interpolate with named params (`{{min}}`, `{{max}}`), not `count` — i18next
treats `count` as a pluralisation trigger and will look for `_one` / `_other`
variants that do not exist.

## Schemas that would bloat the web bundle

`apps/web` must not import runtime values from the `@flama/shared` **root**; see
the note in the repo-root `AGENTS.md`. For forms this means:

- Auth forms import from `@flama/shared/schemas/auth`, which pulls in nothing
  but Zod.
- A schema whose transitive imports do not belong in a browser bundle — one
  that reads the scope catalog, say — stays out of the form: the form declares
  its value type locally and validates with React Hook Form's built-in rules
  instead.
- A new narrow subpath needs an `exports` entry in `packages/shared/package.json`
  **and** an entry in `optimizeDeps.include` in `apps/web/vite.config.ts`;
  workspace `dist` folders sit outside `node_modules`, so Vite will not
  pre-bundle the CommonJS build without being told.
