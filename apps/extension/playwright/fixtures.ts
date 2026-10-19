import path from 'node:path';
import { type BrowserContext, test as base, chromium, expect, type Worker } from '@playwright/test';

/** Where the built, unpacked extension is. */
const DIST = path.resolve(import.meta.dirname, '../dist');
/** The API origin the default build is given (`EXTENSION_PUBLIC_API_URL`). */
export const API = 'http://localhost:3001';

export const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'ada@flama.dev',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'user',
  emailVerified: true,
};

/**
 * A Chromium with the extension loaded, its service worker, and the
 * extension's id. A persistent context because that is the only kind Chrome
 * loads an extension into; `chromium` because the new headless mode is the
 * one that runs extensions.
 */
export const test = base.extend<{
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  signedIn: boolean;
}>({
  signedIn: [false, { option: true }],

  context: async ({ signedIn }, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
    });

    // The API, answered here: a session or none, and the profile behind it.
    await context.route(`${API}/api/auth/get-session`, (route) =>
      route.fulfill({
        json: signedIn
          ? {
              session: { id: 's1', userId: USER.id, expiresAt: '2099-01-01T00:00:00.000Z' },
              user: { ...USER, name: 'Ada Lovelace' },
            }
          : null,
      }),
    );
    await context.route(`${API}/api/v1/profile`, (route) =>
      route.fulfill({
        json: {
          ...USER,
          phone: null,
          jobTitle: null,
          avatarUrl: null,
          twoFactorEnabled: false,
          hasPassword: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    );

    // A first install opens the options page (`background/index.ts`), and
    // Chrome may open it by navigating whichever tab is newest. Wait for it
    // before a test opens tabs of its own, or it lands in one of them.
    await expect
      .poll(() => context.pages().some((page) => page.url().endsWith('/options.html')), {
        timeout: 10_000,
      })
      .toBe(true);

    await use(context);
    await context.close();
  },

  worker: async ({ context }, use) => {
    const [running] = context.serviceWorkers();
    await use(running ?? (await context.waitForEvent('serviceworker')));
  },

  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
});

export { expect } from '@playwright/test';
