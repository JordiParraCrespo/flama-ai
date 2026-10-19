import { expect, test } from './fixtures';

/**
 * The extension in Chrome. What breaks if these fail: Chrome refuses the
 * manifest, or the worker throws on start — and the extension is greyed out
 * on chrome://extensions for everyone who updates; a page renders blank; a
 * removal in the side panel never reaches the worker that owns the list.
 */

test('Chrome accepts the manifest and the worker starts with it', async ({ worker }) => {
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());

  expect(manifest.manifest_version).toBe(3);
  expect(manifest.name).toBe('Flama');
  expect(manifest.host_permissions).toEqual(['http://localhost:3001/*']);
});

test('a first install opens the options page, which asks a signed-out person to sign in', async ({
  context,
  extensionId,
}) => {
  const [options] = context.pages().filter((page) => page.url().endsWith('/options.html'));

  expect(options.url()).toBe(`chrome-extension://${extensionId}/options.html`);
  await expect(options.getByRole('heading', { name: 'Sign in to Flama' })).toBeVisible();
  await expect(options.getByText('It asks Chrome for access to no website.')).toBeVisible();
});

test('the popup asks a signed-out person to sign in', async ({ context, extensionId }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(popup.getByRole('heading', { name: 'Sign in to Flama' })).toBeVisible();
  await expect(popup.getByLabel('Email')).toBeVisible();
});

test.describe('signed in', () => {
  test.use({ signedIn: true });

  test('the popup says when the page under it is closed to extensions', async ({
    context,
    extensionId,
  }) => {
    // Opened as a tab, the popup's active tab is itself: an extension page,
    // which no extension may script.
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.getByText('Flama cannot read this page')).toBeVisible();
    await expect(popup.getByRole('button', { name: 'Save this page' })).toHaveCount(0);
  });

  test('the side panel lists saved pages and removes one through the worker', async ({
    context,
    worker,
    extensionId,
  }) => {
    await worker.evaluate(() =>
      chrome.storage.local.set({
        clips: [
          {
            id: 'b',
            url: 'https://example.com/b',
            title: 'Second page',
            quote: 'a quote',
            savedAt: new Date().toISOString(),
          },
          {
            id: 'a',
            url: 'https://example.com/a',
            title: 'First page',
            quote: '',
            savedAt: new Date(Date.now() - 3_600_000).toISOString(),
          },
        ],
      }),
    );

    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    const rows = panel.getByRole('listitem');
    await expect(rows).toHaveCount(2);
    // The profile, fetched with the session cookie, behind the account button.
    await expect(panel.getByRole('button', { name: 'Account' })).toContainText('AL');
    await expect(rows.first()).toContainText('Second page');
    await expect(rows.first()).toContainText('a quote');

    await rows.first().hover();
    await rows.first().getByRole('button', { name: 'Remove' }).click();

    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('First page');
    const stored = await worker.evaluate(
      async () => (await chrome.storage.local.get('clips')).clips,
    );
    expect(stored).toHaveLength(1);
  });

  test('a save from anywhere lands in an open side panel without a refresh', async ({
    context,
    worker,
    extensionId,
  }) => {
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await expect(panel.getByText('Nothing saved yet')).toBeVisible();

    await worker.evaluate(() =>
      chrome.storage.local.set({
        clips: [
          {
            id: 'x',
            url: 'https://example.com/x',
            title: 'Saved elsewhere',
            quote: '',
            savedAt: new Date().toISOString(),
          },
        ],
      }),
    );

    await expect(panel.getByRole('listitem')).toContainText('Saved elsewhere');
  });
});
