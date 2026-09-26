import { expect, test } from '@playwright/test';
import { provisionedUser, signInAs } from '../../support/web';

/**
 * The OAuth consent screen's guard rails. The full approve round-trip needs a
 * registered OAuth client and is covered from the API side; these hold what
 * the screen decides on its own.
 */

test('a signed-out visitor is sent to sign in and brought back', async ({ page }) => {
  await page.goto('/oauth/consent?consent_code=abc&client_id=cli');
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page).toHaveURL(/consent_code/);
});

test('a link without a consent code is a dead end with a way out', async ({ page }) => {
  const { user, api } = await provisionedUser('consent');
  await signInAs(page, user);

  await page.goto('/oauth/consent');
  await expect(page.getByText('This link has expired')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('link', { name: 'Back to dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await api.dispose();
});

test('an unknown consent code is refused in the page, not with a raw error', async ({ page }) => {
  const { user, api } = await provisionedUser('consentbad');
  await signInAs(page, user);

  await page.goto('/oauth/consent?consent_code=not-a-real-code&client_id=cli&scope=profile:read');
  await page.getByRole('button', { name: 'Approve' }).click();

  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 20_000 });
  await expect(alert).not.toContainText('Request failed with');

  await api.dispose();
});
