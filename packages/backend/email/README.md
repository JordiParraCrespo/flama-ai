# @flama/backend-email

Pluggable transactional email for the API, with templates authored in
[React Email](https://react.email/). Swap drivers without touching call sites.

## What's inside

- `EmailService` — abstract contract (+ typed params like `InvitationEmailParams`).
- `ConsoleEmailService` — logs emails to stdout (local dev / tests).
- `EmailModule.register(drivers)` — builds the driver `email.provider` names,
  out of the map the app passes, and binds it to `EmailService`.
- `renderPasswordResetEmail` and its siblings — the React Email templates
  rendered to HTML, for a driver that delivers them.

Follows the **pluggable service** pattern: abstract class → concrete
implementations → factory in the module. React Email templates render to HTML at
send time.

## Usage

```ts
import { ConsoleEmailService, EmailModule, EmailService } from '@flama/backend-email';

EmailModule.register({ console: ConsoleEmailService });

// inject the abstract service; the module wires the concrete driver
constructor(private readonly email: EmailService) {}
```

## Scripts

```bash
pnpm build   # tsc -> dist
pnpm dev     # tsc --watch
```

## Consumed by

`apps/api`.
