---
"@flama/backend-core": minor
"@flama/api": patch
---

Logs say more with less. A request's line takes its level from its status
(4xx `warn`, 5xx `error`) and carries the problem's `errorCode`; a path in
`quietPaths` (the API's health and readiness probes) is not logged while it
succeeds; every line's text is `msg`, never `message`; Nest's boot listing
of modules and routes is at `debug` (`QuietBootLogger`); and the middleware
routes are written as `{*splat}`, so Nest no longer warns about `*` at every
start.
