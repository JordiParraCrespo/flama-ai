# @flama/mobile — Agent Instructions

Expo (React Native) app using expo-router.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions.

## Stack

- **Expo** + **expo-router** (file-based routes in `app/`)
- **NativeWind** (Tailwind for React Native) — see `tailwind.config.js`,
  `global.css`, `nativewind-env.d.ts`
- UI primitives from `@flama/design-system-mobile`
- **i18next** for i18n (translations from `@flama/translations`)
- **expo-secure-store** for secure token storage

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

## Commands

```bash
pnpm --filter @flama/mobile dev       # start Expo dev server
pnpm --filter @flama/mobile ios
pnpm --filter @flama/mobile android
pnpm --filter @flama/mobile build:dev # EAS build (dev profile)
```
