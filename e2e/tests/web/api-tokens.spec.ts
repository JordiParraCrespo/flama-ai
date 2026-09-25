import { expect, test } from '@playwright/test';
import { clickRowAction, provisionedUser, reloadFromServer, signInAs } from '../../support/web';

/**
 * The API tokens screen, end to end: mint a token, see its secret exactly
 * once, find it again after a cold reload, and revoke it behind a confirm.
 */

test('mints a token, shows the secret once, and revokes it after confirming', async ({ page }) => {
  const { user, api } = await provisionedUser('apitokens');
  await signInAs(page, user);
  await page.goto('/settings/api-tokens');
  await expect(page.getByRole('heading', { name: 'API tokens', level: 1 })).toBeVisible({
    timeout: 30_000,
  });

  // Unique per run: a revoked token stays on the list, so a fixed name would
  // match every token an earlier run left behind.
  const tokenName = `e2e token ${Date.now()}`;

  await page.getByLabel('Name', { exact: true }).fill(tokenName);
  // Each resource group is a toggle group (No access / Read / Edit); grant the
  // first resource Read.
  await page.getByRole('button', { name: 'Read', exact: true }).first().click();
  await page.getByRole('button', { name: 'Create token', exact: true }).click();

  // The secret exists exactly once, in the reply to the call that minted it.
  await expect(page.getByText('Token created')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByText('Token created')).toBeHidden();

  // Reload rather than trust the list the mutation just patched.
  await reloadFromServer(page);
  const row = page.getByRole('row').filter({ hasText: tokenName });
  await expect(row).toBeVisible({ timeout: 20_000 });

  await clickRowAction(page, row, 'Revoke');
  const confirm = page.getByRole('dialog');
  await expect(confirm.getByText(`Revoke “${tokenName}”?`)).toBeVisible();
  await confirm.getByRole('button', { name: 'Revoke', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(row.getByText('Revoked')).toBeVisible();

  await api.dispose();
});

test('cancelling the confirm leaves the token active', async ({ page }) => {
  const { user, api } = await provisionedUser('apitokenscancel');
  await signInAs(page, user);
  await page.goto('/settings/api-tokens');

  const tokenName = `e2e keep ${Date.now()}`;
  await page.getByLabel('Name', { exact: true }).fill(tokenName);
  await page.getByRole('button', { name: 'Read', exact: true }).first().click();
  await page.getByRole('button', { name: 'Create token', exact: true }).click();
  await page.getByRole('button', { name: 'Dismiss' }).click();

  const row = page.getByRole('row').filter({ hasText: tokenName });
  await clickRowAction(page, row, 'Revoke');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

  await expect(row.getByText('Active')).toBeVisible();

  await api.dispose();
});
