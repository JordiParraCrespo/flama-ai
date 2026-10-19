import path from 'node:path';
import { frontendVitestProjects } from '@flama/tsconfig/vitest-frontend.mjs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Deliberately separate from `vite.config.ts`, which builds three targets and
 * emits a manifest — none of which a unit test needs.
 *
 * What runs here is everything below the pages: the messaging and storage
 * runtime against an in-memory `chrome` (`src/runtime/__tests__/fake-chrome.ts`),
 * the service worker's handlers, the content script against jsdom, and the
 * manifest itself. A real Chrome loading the built `dist/` is `playwright/`'s job.
 */
export default defineConfig({
  test: frontendVitestProjects({
    react,
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  }),
});
