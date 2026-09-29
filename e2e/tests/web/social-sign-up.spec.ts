import { expect, test } from '@playwright/test';

/**
 * A social sign-in that the API refused comes back as a redirect with
 * `?error=<code>` on it — the only channel a redirect has. These specs drive
 * that landing directly, because the half worth testing is what the app does
 * with the code, and the half that is not is the provider's consent screen.
 *
 * The two codes below are the ones a sign-in provider comes back with when
 * the API refuses a sign-up from the login screen or a link to an unverified
 * account. The screens handle them whatever providers the app offers, so
 * these run without any: both codes used to leave the reader on a screen that
 * said nothing.
 */

test('a provider account with no user here is sent to register, not left on login', async ({
  page,
}) => {
  await page.goto('/login?error=signup_disabled');

  // The redirect is the behaviour: the login screen cannot create an account,
  // so it must not be where a person who needs one ends up.
  await expect(page).toHaveURL(/\/register/);
  await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
  await expect(page.getByText(/no account here for that sign-in yet/i)).toBeVisible();
});

test('an address that already has a password is told to use it', async ({ page }) => {
  await page.goto('/login?error=account_not_linked');

  // No redirect here: the password field they need is on this screen.
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/already has an account with a password/i)).toBeVisible();
});

test('an unrecognised failure still says something', async ({ page }) => {
  await page.goto('/login?error=invalid_code');

  await expect(page.getByText(/sign-in didn't complete/i)).toBeVisible();
});
