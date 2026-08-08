---
sidebar_position: 6
title: Error reference
---

# Error reference

Every non-2xx response from the Flama API is an **RFC 7807 problem document**
([Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807))
served as `application/problem+json`:

```json
{
  "type": "https://flama.dev/errors#user_001",
  "title": "User not found",
  "status": 404,
  "detail": "No user with id 3f1c0f7e-…",
  "instance": "/api/v1/users/3f1c0f7e-…",
  "code": "USER_001",
  "correlationId": "2b4f…",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Members

| Member          | Standard? | Meaning                                                                                                                             |
| --------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `type`          | RFC 7807  | URI identifying the problem **type** — the anchor on this page. `about:blank` when the status code says everything there is to say. |
| `title`         | RFC 7807  | Short summary of the problem type. **Stable** across occurrences — safe to switch on, though `code` is better.                      |
| `status`        | RFC 7807  | The HTTP status code, repeated in the body.                                                                                         |
| `detail`        | RFC 7807  | What went wrong on **this** request: ids, which scope was missing, which field was rejected. Never assume it is stable.             |
| `instance`      | RFC 7807  | The request path this occurred on.                                                                                                  |
| `code`          | extension | Machine-readable catalog code (`USER_001`). This is what clients should branch on.                                                  |
| `correlationId` | extension | Quote it in a bug report — it ties the response to the server-side log entry.                                                       |
| `timestamp`     | extension | When the problem was produced (ISO 8601).                                                                                           |
| `invalidParams` | extension | Per-field validation failures: `[{ "name": "email", "reason": "Invalid email" }]`.                                                  |

Individual errors may add further extension members (for example
`missingScopes` on `TOKEN_005`). Unknown members should be ignored, not treated
as an error.

An unexpected `5xx` never carries an internal message — the status is preserved
(a readiness failure still answers `503`) but the `detail` always reads
`"An unexpected error occurred. Quote the correlation id when reporting it."`
The specifics are in the server log, keyed by `correlationId`. Catalog errors
that are themselves `5xx` (e.g. `BILLING_001`) keep their curated title, since
that text was written to be shown.

The `type` base is configurable with `ERROR_TYPE_BASE_URL` so a deployment can
point at its own documentation.

## Validation failures {#validation_failed}

**`VALIDATION_FAILED` — 400.** The request body or query string did not match
the endpoint's Zod schema. Every rejected field is listed in `invalidParams`:

```json
{
  "type": "https://flama.dev/errors#validation_failed",
  "title": "Validation failed",
  "status": 400,
  "detail": "The request body or query string did not match the expected schema.",
  "code": "VALIDATION_FAILED",
  "invalidParams": [
    { "name": "email", "reason": "Invalid email" },
    { "name": "scopes.0", "reason": "Invalid scope" }
  ]
}
```

## Users

| Code                           | Title          | HTTP |
| ------------------------------ | -------------- | ---- |
| `USER_001` <a id="user_001" /> | User not found | 404  |

## API tokens

| Code                             | Title                                                              | HTTP |
| -------------------------------- | ------------------------------------------------------------------ | ---- |
| `TOKEN_001` <a id="token_001" /> | API token not found                                                | 404  |
| `TOKEN_002` <a id="token_002" /> | A token cannot be granted permissions its creator does not hold    | 403  |
| `TOKEN_003` <a id="token_003" /> | Invalid or expired API token                                       | 401  |
| `TOKEN_004` <a id="token_004" /> | This API token may not be used from this IP address                | 403  |
| `TOKEN_005` <a id="token_005" /> | This credential is missing a permission required by this endpoint  | 403  |
| `TOKEN_006` <a id="token_006" /> | This endpoint cannot be called with a scoped credential            | 403  |
| `TOKEN_007` <a id="token_007" /> | This credential is not scoped to that organization                 | 403  |
| `TOKEN_008` <a id="token_008" /> | A token can only be scoped to organizations its creator belongs to | 403  |
| `TOKEN_009` <a id="token_009" /> | The maximum number of active API tokens has been reached           | 409  |

`TOKEN_003` is deliberately opaque: unknown, revoked and expired tokens share
one code so the endpoint cannot be used as a probing oracle.

`TOKEN_002` and `TOKEN_005` carry the offending scopes as extension members
(`ungrantableScopes` and `missingScopes`) as well as in `detail`.

## Roles

| Code                           | Title                                                                       | HTTP |
| ------------------------------ | --------------------------------------------------------------------------- | ---- |
| `ROLE_001` <a id="role_001" /> | Role not found                                                              | 404  |
| `ROLE_002` <a id="role_002" /> | A role with this name already exists                                        | 409  |
| `ROLE_003` <a id="role_003" /> | System roles cannot be deleted or renamed                                   | 403  |
| `ROLE_004` <a id="role_004" /> | A system role that grants full access ("manage all") cannot have it removed | 403  |
| `ROLE_005` <a id="role_005" /> | A role cannot be granted permissions its author does not hold               | 403  |
| `ROLE_006` <a id="role_006" /> | A role belonging to another organization cannot be modified                 | 403  |

## Authorization

| Code                             | Title                                                  | HTTP |
| -------------------------------- | ------------------------------------------------------ | ---- |
| `AUTHZ_001` <a id="authz_001" /> | The active organization is not one of your memberships | 403  |
| `AUTHZ_002` <a id="authz_002" /> | This route declares no authorization policy            | 500  |

`AUTHZ_002` is a 500 rather than a 403 on purpose. A route that reached
production without declaring what it requires is a programming error, and
reporting it as a permission problem would send whoever hits it looking in the
wrong place.

## Leads

| Code                           | Title          | HTTP |
| ------------------------------ | -------------- | ---- |
| `LEAD_001` <a id="lead_001" /> | Lead not found | 404  |

Also returned for a lead that exists but sits outside the caller's access
scope. Distinguishing the two would confirm the id.

## Billing

| Code                                 | Title                                        | HTTP |
| ------------------------------------ | -------------------------------------------- | ---- |
| `BILLING_001` <a id="billing_001" /> | Billing is not configured on this server     | 503  |
| `BILLING_002` <a id="billing_002" /> | No billing customer exists for this user     | 404  |
| `BILLING_003` <a id="billing_003" /> | No subscription found                        | 404  |
| `BILLING_004` <a id="billing_004" /> | Invalid Stripe webhook signature             | 400  |
| `BILLING_005` <a id="billing_005" /> | Failed to create a Stripe Checkout session   | 502  |
| `BILLING_006` <a id="billing_006" /> | This user already has an active subscription | 409  |
| `BILLING_007` <a id="billing_007" /> | Failed to open the Stripe Customer Portal    | 502  |
| `BILLING_008` <a id="billing_008" /> | Failed to create a Stripe customer           | 502  |

## Domain invariants

Exceptions raised by the DDD building blocks in `@flama/backend-ddd` surface
with their own codes rather than as a blanket 500:

| Code                                                                     | HTTP |
| ------------------------------------------------------------------------ | ---- |
| `GENERIC.ARGUMENT_INVALID` <a id="generic_argument_invalid" />           | 400  |
| `GENERIC.ARGUMENT_NOT_PROVIDED` <a id="generic_argument_not_provided" /> | 400  |
| `GENERIC.ARGUMENT_OUT_OF_RANGE` <a id="generic_argument_out_of_range" /> | 400  |
| `GENERIC.CONFLICT` <a id="generic_conflict" />                           | 409  |
| `GENERIC.NOT_FOUND` <a id="generic_not_found" />                         | 404  |

## Handling errors as a client

**CLI.** Failures map onto exit codes (`3` auth, `4` forbidden, `5` not found,
`1` everything else) and print `CODE: detail`, listing any rejected fields.

**MCP.** Tools throw `FlamaApiError`, which carries `status`, `code`,
`correlationId` and the whole `problem` document.

**Web / mobile.** `@flama/frontend` normalises failures into `AppError` via
`toAppError`, which keeps the server's `detail`, exposes `fieldErrors` for form
handling, and falls back to the module's own error catalog when the API could
not be reached at all.

## Adding an error

Add an entry to the module's catalog in `apps/api/src/<module>/domain/<module>.errors.ts`
and throw it:

```ts
throw new AppError(UserErrors.NOT_FOUND, {
  detail: `No user with id ${id}`,
  extensions: { userId: id },
});
```

The catalog `message` becomes the problem `title`, so keep it stable and put
anything specific to the request in `detail`. Document the failure on the
endpoint with `@ApiProblemResponse({ status, description, code })`, then add a
row to this page.
