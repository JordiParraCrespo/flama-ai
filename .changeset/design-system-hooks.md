---
"@flama/design-system-web": minor
"@flama/design-system-mobile": minor
"@flama/frontend-web": minor
---

Generic React hooks live in the design systems' `hooks/`, exported from the root of both packages with the same names, signatures and behaviour: `useControlled` (the `value` / `defaultValue` / `onChange` triple, written once), `useDebouncedValue`, `useDebouncedCallback` and `useNow` (the time as an input that ticks, so the React Compiler cannot freeze an age computed in render). The web package also exposes each as a `./hooks/*` subpath.

`useDebouncedCallback` moves down from `@flama/frontend-web`'s `table` concern, keeping its `cancelKey`, and now writes its latest-callback ref after commit instead of during render, which the React Compiler refuses to compile. Breaking: `@flama/frontend-web` no longer exports `useDebouncedCallback`; import it from `@flama/design-system-web`. `DataTableSearch` behaves as before.

The web `SidebarProvider` and the mobile `ToolCall` use `useControlled` instead of hand-rolled controlled/uncontrolled state. An uncontrolled `SidebarProvider` given only `onOpenChange` now opens and closes; it used to hand the change to the callback and never update itself.
