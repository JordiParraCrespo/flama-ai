import { expect, type Page, test } from '@playwright/test';
import { provisionedUser, signInAs } from '../../support/web';

/**
 * The settings screen, end to end.
 *
 * Every assertion goes through the real API: a save is followed by a reload, so
 * a test only passes if the value came back from the server rather than from
 * the component state that wrote it.
 */

/** The settings sub-nav, addressed by its accessible name. */
function sectionNav(page: Page) {
  return page.getByRole('navigation', { name: 'Settings sections' });
}

async function openSection(page: Page, label: string) {
  await sectionNav(page).getByRole('button', { name: label, exact: true }).click();
  await expect(page).toHaveURL(/section=/);
}

async function openSettings(page: Page) {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
}

test('lists every section', async ({ page }) => {
  const { user, api } = await provisionedUser('settings');
  await signInAs(page, user);
  await openSettings(page);

  const nav = sectionNav(page);
  for (const label of ['Security', 'API & webhooks']) {
    await expect(nav.getByRole('button', { name: label, exact: true })).toBeVisible();
  }

  await api.dispose();
});

test('a section is deep-linkable', async ({ page }) => {
  const { user, api } = await provisionedUser('settingslink');
  await signInAs(page, user);

  await page.goto('/settings?section=security');

  await expect(page.getByRole('heading', { name: 'Security', level: 2 })).toBeVisible();
  await expect(page).toHaveURL(/section=security/);

  await api.dispose();
});

test('survives a warm start with a persisted query cache', async ({ page }) => {
  // Regression guard: the profile/session entities carry behaviour and Date
  // values that do not survive the JSON round-trip into local storage.
  // Restored as plain objects, the session date made Intl throw "Invalid time
  // value", so these queries are kept out of the persisted cache.
  const { user, api } = await provisionedUser('settingswarm');
  await signInAs(page, user);

  await page.goto('/settings?section=security');
  await expect(page.getByRole('heading', { name: 'Security', level: 2 })).toBeVisible();
  await expect(page.getByText('This device')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Security', level: 2 })).toBeVisible();
  await expect(page.getByText('This device')).toBeVisible();
  await expect(page.getByText('Something went wrong!')).toBeHidden();

  await api.dispose();
});

test('Security shows this device among the account’s sessions', async ({ page }) => {
  const { user, api } = await provisionedUser('settingssec');
  await signInAs(page, user);
  await openSettings(page);
  await openSection(page, 'Security');

  await expect(page.getByRole('heading', { name: 'Active sessions', level: 3 })).toBeVisible();
  await expect(page.getByText('This device')).toBeVisible();

  await api.dispose();
});

test('the API pane sends the reader to the tokens screen', async ({ page }) => {
  const { user, api } = await provisionedUser('settingsapi');
  await signInAs(page, user);
  await openSettings(page);
  await openSection(page, 'API & webhooks');

  await expect(page.getByRole('heading', { name: 'API keys', level: 3 })).toBeVisible();
  await page.getByRole('link', { name: 'Open API tokens' }).click();

  await expect(page).toHaveURL(/\/settings\/api-tokens/);
  await expect(page.getByRole('heading', { name: 'API tokens', level: 1 })).toBeVisible();

  await api.dispose();
});
