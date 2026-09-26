import { expect, type Page, test } from '@playwright/test';
import { provisionedUser, signInAs } from '../../support/web';

/**
 * The sidebar shows only the routes the signed-in user's permissions can reach,
 * end to end. Each row's visibility is decided by the same effective ability the
 * API's `PoliciesGuard` checks (served by `GET /users/me/permissions`), so this
 * asserts against the real permission set of two accounts — not a stub.
 *
 * Every row in `apps/web/src/lib/nav.ts` is ungated today: the dashboard reads
 * only the caller's own profile, and every user manages their own API tokens
 * under Settings. So an owner and a plain member are offered the same two rows,
 * and a permission set that arrives late or not at all must not take either
 * away. The first gated row adds its hidden-for-a-member case here.
 */

/** The primary nav landmark, addressed by its accessible name. */
function primaryNav(page: Page) {
  return page.getByRole('navigation', { name: 'Main navigation' });
}

test('an owner sees every route', async ({ page }) => {
  const owner = await provisionedUser('navowner');
  await signInAs(page, owner.user);

  const nav = primaryNav(page);
  for (const label of ['Dashboard', 'Settings']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  }

  await owner.api.dispose();
});

test('the command palette offers the same destinations as the sidebar', async ({ page }) => {
  const owner = await provisionedUser('navpalette');
  await signInAs(page, owner.user);

  await page.getByRole('button', { name: 'Search' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (const label of ['Dashboard', 'Settings']) {
    await expect(dialog.getByRole('option', { name: label })).toBeVisible();
  }

  await dialog.getByRole('option', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings/);

  await owner.api.dispose();
});
