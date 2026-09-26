import { expect, type Page, test } from '@playwright/test';
import { ORGANIZATION_NAME } from '../../support/organizations';
import { provisionedUser, reloadFromServer, signInAs } from '../../support/web';

/**
 * The organization's own pane in Settings, General, end to end. A save is
 * followed by a reload, so a test only passes if the value came back from the
 * server rather than from the component state that wrote it.
 */

/** The settings sub-nav, addressed by its accessible name. */
function sectionNav(page: Page) {
  return page.getByRole('navigation', { name: 'Settings sections' });
}

async function openSettings(page: Page) {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
}

test('opens on General', async ({ page }) => {
  const { user, api } = await provisionedUser('settings');
  await signInAs(page, user);
  await openSettings(page);

  const nav = sectionNav(page);
  await expect(nav.getByRole('button', { name: 'General', exact: true })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'General', level: 2 })).toBeVisible();
  await expect(page.getByLabel('Organisation name')).toHaveValue(ORGANIZATION_NAME, {
    timeout: 20_000,
  });

  await api.dispose();
});

test('General renames the workspace, and the sidebar follows', async ({ page }) => {
  const { user, api } = await provisionedUser('settingsname');
  await signInAs(page, user);
  await openSettings(page);

  await expect(page.getByLabel('Organisation name')).toHaveValue(ORGANIZATION_NAME, {
    timeout: 20_000,
  });
  const nextName = `${ORGANIZATION_NAME} (renamed)`;
  await page.getByLabel('Organisation name').fill(nextName);
  await page.getByRole('button', { name: 'Save changes' }).click();
  // Success is a toast, and only a toast.
  await expect(page.getByText('Organization settings saved')).toBeVisible();

  await reloadFromServer(page);
  await expect(page.getByLabel('Organisation name')).toHaveValue(nextName, { timeout: 20_000 });
  await expect(page.locator('[data-sidebar=header]').getByText(nextName)).toBeVisible();

  await api.dispose();
});

test('General refuses an empty name before asking the server', async ({ page }) => {
  const { user, api } = await provisionedUser('settingsempty');
  await signInAs(page, user);
  await openSettings(page);

  await expect(page.getByLabel('Organisation name')).toHaveValue(ORGANIZATION_NAME, {
    timeout: 20_000,
  });
  await page.getByLabel('Organisation name').fill('');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('This field is required')).toBeVisible();

  await api.dispose();
});
