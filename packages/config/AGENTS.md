# @flama/config — Agent Instructions

Shared TypeScript configuration presets extended by every app and package.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first.

## Contents

```
tsconfig.library.json   # base for shared library packages
tsconfig.nestjs.json    # backend (apps/api, backend/*)
tsconfig.nextjs.json    # Next.js apps (showcases)
```

Consumers reference these via `"extends": "@flama/config/tsconfig.*.json"` in
their own `tsconfig.json`.

## When modifying

- Changes here affect **every** consumer's compilation. Prefer additive,
  well-considered changes and verify a representative app/package still builds
  and type-checks.
- Match the preset to the runtime target (library vs NestJS vs Next.js) rather
  than adding per-app overrides upstream.
