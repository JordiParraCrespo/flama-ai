# @flama/react-hooks — Agent Instructions

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) first.

The generic React hooks, once. It sits below both design systems, which is
why it is its own package and not part of `@flama/frontend-core`: the design
systems do not depend on the kernel.

## What goes here

- A hook with nothing in it but React: a timer, a controlled/uncontrolled
  pair, a latest-ref, a debounce. Before writing one of those anywhere else,
  check `src/hooks/`.
- Not a hook that touches the DOM (`useIsMobile` stays in
  `@flama/design-system-web`), React Native (`useHardwareBack` stays in
  `@flama/design-system-mobile`), a query, or the product. `pnpm arch` fails
  on any import but `react`.

One file per hook in `src/hooks/`, exported by name from `src/index.ts`, with a spec
in `src/__tests__/`. Import it from `@flama/react-hooks` directly; the design
systems do not re-export it.

## Before pushing

```bash
pnpm --filter @flama/react-hooks test
pnpm --filter @flama/react-hooks typecheck   # source-exported: no dist to build
pnpm --filter @flama/react-hooks arch
```

The rules for using these hooks — one clock above the list, one
implementation — are
[`.agents/rules/frontend-architecture.md`](../../../.agents/rules/frontend-architecture.md).
