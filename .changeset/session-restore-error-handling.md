---
"@flama/frontend": patch
"@flama/translations": patch
---

Surface session-restore failures instead of silently logging the user out.

Previously a transient network/server error during startup session restore was
indistinguishable from being genuinely unauthenticated: `getSession()` swallowed
the error as `null`, `useSessionRestore` ran with `retry: false` and no error
handling, and both the web and mobile `AuthGate`s only branched on `isLoading` —
so a single network blip bounced a logged-in user to `/login`.

- **`@flama/frontend`**: `useSessionRestore` now retries transient failures
  (`retry: 2` with exponential backoff). A genuinely unauthenticated user still
  resolves successfully, so retries only fire on real errors.
- **web/mobile auth clients**: `getSession()` now throws on transport/server
  errors instead of returning `null`, letting the query distinguish a failed
  lookup from an unauthenticated session.
- **web/mobile `AuthGate`**: render a "connection problem" screen with a retry
  action on restore failure instead of falling through to `/login`.
- **`@flama/translations`**: new `auth.session` strings (en + es).
