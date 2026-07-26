# @flama/design-system-web

Web component library for Flama — shadcn/ui-style components built on
[Base UI](https://base-ui.com/) primitives and Tailwind CSS v4. Consumed by
`apps/web` and previewed in `apps/web-showcase`.

## Usage

Import components from their per-component subpath (tree-shakeable) or from the
package root:

```tsx
import { Button } from "@flama/design-system-web/button";
import { Card, CardHeader, CardContent } from "@flama/design-system-web";
import { cn } from "@flama/design-system-web/utils";
```

Wire up the styles and Tailwind preset in the consuming app:

```ts
// tailwind entry / config
import "@flama/design-system-web/styles"; // globals.css (tokens + base layer)
import preset from "@flama/design-system-web/tailwind-config";
```

## What's inside

- `src/components/*` — Button, Card, Dialog, DropdownMenu, Sidebar, Table, Tabs,
  Command, Chart (Recharts), Sonner toasts, and more — each with its own export.
- `src/hooks/use-mobile` — viewport helper.
- `src/lib/utils` — `cn()` (clsx + tailwind-merge).
- `src/styles/globals.css` — design tokens and Tailwind base layer.
- `tailwind.config.ts` — shared preset.

`react`, `react-dom`, and `recharts` are peer dependencies supplied by the app.

## Scripts

```bash
pnpm build   # tsup -> dist
pnpm dev     # tsup --watch
```

## Consumed by

`apps/web`, `apps/web-showcase`.
