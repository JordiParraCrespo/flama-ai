# @flama/backend-email — Agent Instructions

Pluggable email: the email port, the module that binds it, the console driver
and the React Email templates.

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) and
> [`.agents/rules/backend-packages.md`](../../../.agents/rules/backend-packages.md)
> (see the email-template setup notes there).

## Layout

```
src/
├── email.module.ts            # NestJS module: binds the port to the configured driver
├── email.service.ts           # abstract EmailService (the port)
├── console-email.service.ts   # dev: logs to console
├── render.ts                  # React Email -> HTML rendering
├── templates/                 # React Email templates
└── index.ts
```

## Conventions

- **Pluggable service pattern**: abstract `EmailService` → concrete
  implementations (drivers) → chosen by the factory in `EmailModule`. The
  package ships the port and the console driver, and names no other: the app
  passes the drivers it runs on to `EmailModule.register({ console: … })`, and
  its config accepts exactly those names. A driver is a class whose
  constructor takes the `ConfigService`; do not branch inside callers.
- Templates are **React Email** components rendered via `render.ts`, which the
  package exports for the drivers that deliver them.
- Ships **CommonJS**.

## Commands

```bash
pnpm --filter @flama/backend-email build
pnpm --filter @flama/backend-email dev
```
