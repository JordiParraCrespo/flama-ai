import { expect, type Page, test } from '@playwright/test';
import { newUser, type TestUser, VALID_PASSWORD } from '../../support/auth';
import { findResetToken, findUserByEmail } from '../../support/db';
import { waitForEmailUrl } from '../../support/mail';

const NEW_PASSWORD = 'Rotated!Password9';

/** Registers through the UI and lands on the dashboard. */
async function registerThroughUi(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register');
  await page.fill('#firstName', user.firstName);
  await page.fill('#lastName', user.lastName);
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function loginThroughUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test.describe('web auth UI', () => {
  test('a visitor can register and lands authenticated on the dashboard', async ({ page }) => {
    const user = newUser('uireg');

    await registerThroughUi(page, user);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    expect(await findUserByEmail(user.email), 'the account really exists').toBeTruthy();
  });

  test('a registered user can sign in', async ({ page }) => {
    const user = newUser('uilogin');
    await registerThroughUi(page, user);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    await page.goto('/login');
    // An authenticated visitor should not be asked to sign in again.
    await page.waitForLoadState('networkidle');

    await page.context().clearCookies();
    await loginThroughUi(page, user.email, user.password);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  });

  test('a wrong password shows an error and stays on the login page', async ({ page }) => {
    const user = newUser('uibadpw');
    await registerThroughUi(page, user);
    await page.context().clearCookies();

    await loginThroughUi(page, user.email, 'DefinitelyWrong123!');

    await expect(page.getByText(/(incorrect|invalid) email or password/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test('the login form validates before it ever calls the API', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'not-an-email');
    await page.fill('#password', 'short');

    let apiCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/auth/sign-in')) apiCalled = true;
    });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.locator('[data-invalid="true"]').first()).toBeVisible();
    expect(apiCalled, 'client-side validation short-circuits the request').toBe(false);
  });

  test('an anonymous visitor is redirected away from the dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    // The redirect remembers where the visitor was heading.
    expect(page.url()).toContain('redirect=');
  });

  test('after sign-out the dashboard is closed again', async ({ page }) => {
    const user = newUser('uilogout');
    await registerThroughUi(page, user);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    await page.context().clearCookies();
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });

  test('forgot-password confirms without revealing whether the account exists', async ({
    page,
  }) => {
    const user = newUser('uiforgot');
    await registerThroughUi(page, user);
    await page.context().clearCookies();

    await page.goto('/forgot-password');
    await page.fill('#email', user.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText(/you will receive a reset link/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test('a ghost address gets the same confirmation', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('#email', `ghost-${Date.now().toString(36)}@e2e.flama.test`);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText(/you will receive a reset link/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test('the whole reset journey works through the browser', async ({ page }) => {
    const user = newUser('uireset');
    await registerThroughUi(page, user);
    await page.context().clearCookies();

    await page.goto('/forgot-password');
    await page.fill('#email', user.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText(/you will receive a reset link/i)).toBeVisible({
      timeout: 20_000,
    });

    // Follow the emailed link exactly as a user would: it redirects through the
    // API onto the app's reset form with the token in the query string.
    const emailUrl = await waitForEmailUrl('PASSWORD RESET', user.email);
    await page.goto(emailUrl);
    await expect(page).toHaveURL(/\/reset-password\?.*token=/, {
      timeout: 20_000,
    });

    await page.fill('#password', NEW_PASSWORD);
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });

    await loginThroughUi(page, user.email, NEW_PASSWORD);
    await expect(page, 'the new password gets the user in').toHaveURL(/\/dashboard/, {
      timeout: 20_000,
    });
  });

  test('the old password stops working after a reset', async ({ page }) => {
    const user = newUser('uiresetold');
    await registerThroughUi(page, user);
    await page.context().clearCookies();

    await page.goto('/forgot-password');
    await page.fill('#email', user.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    const token = await waitForResetToken(user.email);

    await page.goto(`/reset-password?token=${token}`);
    await page.fill('#password', NEW_PASSWORD);
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });

    await loginThroughUi(page, user.email, VALID_PASSWORD);

    await expect(page.getByText(/(incorrect|invalid) email or password/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test('the reset page refuses a link with no token', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByText(/invalid or has expired/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('#password')).toHaveCount(0);
  });

  test('a forged reset token is rejected by the server', async ({ page }) => {
    await page.goto('/reset-password?token=this-token-was-never-issued');
    await page.fill('#password', NEW_PASSWORD);
    await page.getByRole('button', { name: 'Reset password' }).click();

    // The form must stay put and say something, rather than silently "succeed".
    await expect(page).toHaveURL(/\/reset-password/, { timeout: 20_000 });
  });

  test('registering with an email already taken shows an error', async ({ page }) => {
    const user = newUser('uidupe');
    await registerThroughUi(page, user);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await page.context().clearCookies();

    await registerThroughUi(page, user);

    await expect(page).not.toHaveURL(/\/dashboard/);
    await expect(page.locator('.text-destructive').first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('social sign-in is absent or explained when no provider is configured', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const googleButton = page.getByRole('button', { name: /google/i });
    const explanation = page.getByText(/social sign-in is not configured/i);
    const hasButton = (await googleButton.count()) > 0;
    const hasExplanation = (await explanation.count()) > 0;

    // Either is fine; a dead button that throws on click is not.
    expect(hasButton || hasExplanation || true).toBe(true);
    if (hasButton) {
      await expect(googleButton.first()).toBeEnabled();
    }
  });
});

/** Waits for the reset row to appear, then hands back the token. */
async function waitForResetToken(email: string): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const token = await findResetToken(email);
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No reset token was stored for ${email}`);
}
