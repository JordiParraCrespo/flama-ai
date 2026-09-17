import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Two projects, because they want opposite things from the React Compiler.
 *
 * - `unit` runs it, so a test exercises what the apps actually ship.
 * - `render-budget` does not, and that is the point: the compiler memoises a
 *   badly-shaped component into a good profile, so a `*-render.spec.tsx` that
 *   ran with it on would be measuring the build step rather than the code. See
 *   `src/table/components/data-table-render.spec.tsx`.
 */
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react({ compiler: true })],
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
          exclude: ['src/**/*-render.spec.tsx'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'render-budget',
          environment: 'jsdom',
          include: ['src/**/*-render.spec.tsx'],
        },
      },
    ],
  },
});
