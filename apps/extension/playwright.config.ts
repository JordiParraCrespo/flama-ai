import { defineConfig } from '@playwright/test';

/**
 * The built extension, loaded into a real Chromium. `pnpm --filter
 * @flama/extension e2e` after `build`.
 *
 * The API is answered by the specs themselves (`playwright/fixtures.ts`), so this
 * runs with nothing else up: what it proves is the extension — that Chrome
 * accepts the manifest, the worker starts, the pages render and the contexts
 * reach each other — not the API, which the repo's API suite covers.
 */
export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { trace: 'retain-on-failure' },
});
