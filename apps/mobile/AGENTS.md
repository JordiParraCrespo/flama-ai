# @flama/mobile — Agent Instructions

Expo (React Native) app using expo-router.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions.

## Stack

- **Expo** + **expo-router** (file-based routes in `app/`)
- **NativeWind** (Tailwind for React Native) — see `tailwind.config.js`,
  `global.css`, `nativewind-env.d.ts`
- UI primitives from `@flama/design-system-mobile`
- **i18next** for i18n (translations from `@flama/translations`)
- **React Hook Form** + `zodResolver` for forms (`Controller` per field — the
  DOM-ref `register()` path does not work in React Native)
- **expo-secure-store** for secure token storage
- **TanStack Query** for server state, persisted to `AsyncStorage` (policy from
  `@flama/frontend/react`, wired in `lib/query.ts`)

## Layout

```
app/                  # expo-router screens/routes
components/            # app-local components
lib/                  # helpers
types/
app.config.ts         # Expo config
metro.config.js       # Metro bundler (monorepo-aware)
```

## Where code goes

- **Business logic lives in `@flama/frontend`**, not in screens. That package
  is shared with web; mobile injects platform-specific implementations (secure
  storage, etc.) via its InversifyJS DI container.
- Reusable UI comes from `@flama/design-system-mobile`.

## Forms

React Hook Form, validated by a Zod schema from `@flama/shared`. Full
convention in [`.claude/rules/forms.md`](../../.agents/rules/forms.md); the
short version:

- `useForm({ resolver: useZodResolver(schema) })` — always via
  `lib/use-zod-resolver.ts`, never `zodResolver` directly, or the messages come
  out untranslated.
- Every field goes through `Controller`: React Native has no DOM refs, so
  `register()` does not work. Wire `value`, `onChangeText` **and** `onBlur` —
  dropping `onBlur` leaves `touched` stale and silently disables blur-mode
  validation.
- Wrap each control in `components/form-field.tsx`, which mirrors the web
  `Field` (label + control + inline error). Validation failures belong inline,
  not in an `Alert`.

## Commands

```bash
pnpm --filter @flama/mobile dev       # start Expo dev server
pnpm --filter @flama/mobile ios
pnpm --filter @flama/mobile android
pnpm --filter @flama/mobile build:dev # EAS build (dev profile)
```
