---
"@flama/shared": minor
"@flama/backend-core": minor
"@flama/api-client": minor
"@flama/frontend": minor
"@flama/translations": patch
---

Capability registry: a missing optional key disables a feature instead of
booting with a `'not-set'` sentinel.

- `@flama/shared` exports `DEPLOYMENT_CAPABILITIES` / `DeploymentCapabilities`
  — the catalog of optional features a deployment may or may not have
  (`google_oauth`, `github_oauth`, `stripe_billing`, `s3_storage`,
  `email_delivery`).
- `@flama/backend-core` gains a `CapabilitiesService` registry: the app
  resolves its capability set from config once at boot, logs it at startup,
  and every consumer asks the registry instead of comparing raw config against
  sentinel values.
- The API's OAuth config keys are now genuinely optional
  (`z.string().optional()`) rather than defaulting to `'not-set'`, and the
  resolved capability set is served publicly at `GET /health/capabilities`.
- `@flama/api-client` picks up the generated `HealthApi.deploymentCapabilities()`.
- `@flama/frontend` adds a `capabilities` module and a
  `useDeploymentCapabilities()` hook; the web login page uses it to render
  only configured social providers, and to name the env vars to set when none
  are (only after a successful read — an unreachable API is not a missing
  configuration).
