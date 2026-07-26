# @flama/design-system-mobile

React Native component library for Flama — shadcn-style components built on
[NativeWind](https://www.nativewind.dev/) and
[`@rn-primitives`](https://rnprimitives.com/) (React Native Reusables). The
component API mirrors `@flama/design-system-web` so the two platforms stay
consistent. Consumed by `apps/mobile` and previewed in `apps/mobile-showcase`.

## Usage

Import components from their per-component subpath:

```tsx
import { Button } from "@flama/design-system-mobile/button";
import { Text } from "@flama/design-system-mobile/text";
import { cn } from "@flama/design-system-mobile/utils";
```

## What's inside

- `src/components/ui/*` — Accordion, AlertDialog, Avatar, Button, Card, Dialog,
  DropdownMenu, Select, Tabs, Tooltip, Text, and more — each with its own export.
- `src/lib/utils` — `cn()` (clsx + tailwind-merge).

Styling uses NativeWind (Tailwind for React Native). The `@rn-primitives/*`
packages, `nativewind`, `react`, and `react-native` (plus its native
peer libraries) are **peer dependencies** provided by the consuming Expo app —
see `package.json` for the full list.

## Scripts

```bash
pnpm build   # tsc -> dist
pnpm dev     # tsc --watch
pnpm lint    # biome check src/
```

## Consumed by

`apps/mobile`, `apps/mobile-showcase`.
