# @flama/frontend — Agent Instructions

Platform-agnostic frontend core shared by `apps/web` and `apps/mobile`. This is
where frontend **business logic** lives — not in app components/screens.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first.

## Architecture

Clean architecture with **InversifyJS** dependency injection and **Zustand**
vanilla stores. Each app supplies platform-specific implementations (storage,
HTTP, navigation) by binding them into the DI container.

```
src/
├── modules/          # feature modules
│   ├── auth/
│   ├── users/
│   └── core/         # cross-module primitives
├── di/               # InversifyJS container, tokens, bindings
├── react/            # React bindings/hooks (useInjection, providers)
├── validation/       # Zod error map bridging schemas to translated messages
└── index.ts
```

Per module, follow the layering: **domain → presentation → data-access**.

## Conventions

- **Zustand vanilla stores** are framework-agnostic so web and mobile share
  them; the `react/` layer exposes them to components.
- **TanStack Query** manages server state.
- Data-access wraps `@flama/api-client`; never call HTTP directly from domain.
- Platform-specific behavior is injected via DI — depend on abstractions
  (ports/tokens) defined in `di/`, not on concrete app code.
- Shared types/schemas come from `@flama/shared`.

## Commands

```bash
pnpm --filter @flama/frontend build
pnpm --filter @flama/frontend dev
pnpm --filter @flama/frontend test
```
