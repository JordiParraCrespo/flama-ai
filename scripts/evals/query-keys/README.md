# Query-key eval

Does an agent follow the query-key conventions when nobody tells it to? The
conventions are the key factories in `packages/frontend/*/src/react/`
(`apiTokensKeys`, `profileKeys`, `usersKeys`: every key derived from `all`),
`withCacheOnSuccess` in `@flama/frontend-core/react`, and the Biome plugins in
`biome-plugins/` (`query-key-factory`, `mutation-on-success`,
`query-skip-token`) that hold them.

A task in `tasks.json` is a ticket that names the hook to add and says nothing
about keys. `claude -p` does it in a throwaway worktree with `scripts/evals`
removed. The grader then runs the Biome plugins the task names, the consumer
build and tests, and `hidden/<task>.spec.tsx` against a real `QueryClient`.

The one task, `api-token-rename`, targets the `api-tokens` module, which every
project keeps (`organizations` is optional, and a task against it would break
the day a project prunes it). The hidden spec asks: is the renamed row written
into the list from the API's answer, does the caller's `onSuccess` still run,
are the permission catalog and the current credential left alone, and is the
invalidation narrower than the feature's root and the profile's cache.

```bash
node scripts/evals/query-keys/run.mjs [--task <id>] [--model <id>]   # the agent
node scripts/evals/query-keys/run.mjs --reference   # must score 100%
node scripts/evals/query-keys/run.mjs --control     # every guideline check must fail under some control
node scripts/evals/query-keys/run.mjs --task <id> --patch <file>     # re-grade a saved diff
```

`reference/<task>.patch` is a correct solution. `controls/<task>.<variant>.patch`
is a small known-bad change applied on top of it: `spread-last` lets a
caller's `onSuccess` replace the cache write, `hook-last` drops the caller's,
and `invalidate-all` invalidates the whole `apiTokens` tree instead of writing
the row. Only the export, build and existing-test checks are failed by no
control. On a machine that cannot fetch every app's dependencies, pass
`--install-args` (see `scripts/evals/frontend-audit/README.md`). Reports go to
`results/` (git-ignored). This is not a CI job: each agent run costs tokens.
