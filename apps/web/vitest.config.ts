import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Deliberately separate from `vite.config.ts`. The app config carries the
 * router codegen plugin, Tailwind, and a `commonjsOptions` block for
 * `@flama/shared`'s CJS build — none of which a unit test needs, and the router
 * plugin regenerates `routeTree.gen.ts` as a side effect of being loaded.
 *
 * What unit tests cover here is `src/lib/`, the app-shell hooks and the render
 * budgets: the pure helpers, the hooks that hold URL and query state, and the
 * handful of components whose cost is the thing worth asserting. Rendering
 * whole routes stays in `e2e/`, where a real router and a real API make the
 * assertions worth their runtime.
 *
 * Two projects, because they want opposite things from the React Compiler:
 *
 * - `unit` runs it, so a test exercises what production ships.
 * - `render-budget` does not, and that is the point. The compiler memoises a
 *   badly-shaped component into a good profile — a page that threaded a query
 *   down to a single consumer, a picker that re-rendered thirty-three toggles
 *   for one click, both read as zero wasted renders with it on. Turning it off
 *   is what lets a test see the structure it is there to hold.
 */
const alias = { '@': path.resolve(import.meta.dirname, './src') };

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react({ compiler: true })],
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
          exclude: ['src/**/*-render.spec.tsx'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'render-budget',
          environment: 'jsdom',
          include: ['src/**/*-render.spec.tsx'],
        },
      },
    ],
  },
});
