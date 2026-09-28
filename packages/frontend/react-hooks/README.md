# @flama/react-hooks

Generic React hooks: no DOM, no React Native, no product, no query. The one
copy both design systems, both platform kits and the apps import.

| Hook | What it is |
| --- | --- |
| `useControlled({ value, defaultValue, onChange })` | A controlled/uncontrolled `value`, written once. Functional updates compose like `useState`'s. |
| `useDebouncedValue(value, delay)` | `value`, once it has held still for `delay`. For a settled value read in render. |
| `useDebouncedCallback(fn, delay, cancelKey?)` | `fn`, called once a burst of calls has held still. For a settled value handed up. |
| `useNow(intervalMs)` | The time as an input that ticks. Called once above a list; rows take `now` as a prop. |

```ts
import { useNow } from '@flama/react-hooks';
```

Source-exported (`./src/index.ts`): the bundler of each app compiles it, the
way it compiles the design systems. It depends on React alone, and
`pnpm --filter @flama/react-hooks arch` holds that.

```bash
pnpm --filter @flama/react-hooks test
pnpm --filter @flama/react-hooks typecheck
pnpm --filter @flama/react-hooks arch
```
