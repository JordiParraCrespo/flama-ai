# CI

Pull request CI is kept small. The suite runs where the change was made,
before the push, and CI confirms it.

## What runs

`affected.mjs` decides, from the diff against the base branch:

| Job | Runs when |
|---|---|
| **Check**: Biome, the contracts, build, arch, unit tests, Go lint, bundle budgets | Every run, over the affected packages. A draft pull request skips CI until it is marked ready. |
| **Integration Tests** | `@flama/api` is affected. |
| **End-to-End Tests (API)** | `@flama/api` or `@flama/e2e` is affected. |
| **Build Docker Images** | On a push to `main`, in a merge queue, or with the `ci:full` label: every affected image. On any other pull request: only an image whose own `Dockerfile` changed, or all of them if `.dockerignore` changed. |
| **CI** | Always. This is the check to require. It fails unless Check succeeded and every other job succeeded or was skipped. |

"Affected" is Turborepo's `--affected`: the packages the diff touches plus
everything that depends on them. A change to a file no package owns (the
workflow, the lockfile, `docker/`, `scripts/`, the patterns in
`GLOBAL_PATHS`) widens the run to every package. A push to `main` always
runs every package.

A new Docker image is a row in `IMAGES`. A new root-level file every package
relies on is a pattern in `GLOBAL_PATHS`.

## Running it locally

```bash
pnpm ci:local              # affected packages, against origin/main
pnpm ci:local --all        # every package
```

There is one step catalog: the Check job in `.github/workflows/ci.yml`.
`local.mjs` reads the steps after `scope` and runs each `run:` body as the
runner does, with the same `AFFECTED_PACKAGES` / `AFFECTED_FILTERS`. Those
steps stay plain shell: no `if:`, no `uses:`, no `${{ }}`. The script refuses
a step it cannot run, and `local.test.mjs` fails on one.

When every step passes on a clean working copy, HEAD's tree is recorded in
`.git/flama-ci-ok`. The `pre-push` hook in `.githooks/` checks the tree of
each commit being pushed against that record. Both sides key on the commit's
tree, so an amend or rebase that keeps the content needs no second run.
`pnpm install` enables the hook (`prepare` sets `core.hooksPath`), so it holds
for every pusher. Pushes from GitHub Actions and `git push --no-verify` skip
it.

The record is a convenience, not an attestation. Nothing is reported to
GitHub, and CI still runs Check on every push.
