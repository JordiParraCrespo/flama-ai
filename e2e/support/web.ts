import { expect, type Locator, type Page } from '@playwright/test';
import { signedUpContext, type TestUser } from './auth';

// flama:begin organizations
import { createOrganization } from './organizations';
// flama:end organizations
// flama:plugins tenancy-imports

/**
 * Helpers for the `web` project: the journeys every browser spec starts from.
 *
 * Registering creates an account and nothing else — an account belongs to no
 * workspace until it creates one from `/onboarding` or an invitation puts it in
 * one — so most specs want a user who already has somewhere to work. That is
 * {@link provisionedUser}: sign-up and workspace creation through the API, so
 * the spec spends its time on the screen it is about rather than on the two
 * screens before it.
 */

export async function registerThroughUi(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register');
  await page.fill('#firstName', user.firstName);
  await page.fill('#lastName', user.lastName);
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
}

export async function loginThroughUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

/** Signs in through the real form and waits for the workspace shell. */
export async function signInAs(
  page: Page,
  user: { email: string; password: string },
): Promise<void> {
  await loginThroughUi(page, user.email, user.password);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

/**
 * A fresh account with a session cookie to match — and, with organizations, a
 * workspace of its own, so the shell opens rather than sending it to onboarding.
 */
export async function provisionedUser(prefix = 'user') {
  const { api, user, userId } = await signedUpContext(prefix);
  const workspace = {
    // flama:begin organizations
    organizationId: await createOrganization(api),
    // flama:end organizations
    // flama:plugins provision-workspace
  };
  return { api, user, userId, ...workspace };
}

/**
 * Reloads with the persisted query cache thrown away.
 *
 * TanStack Query's cache is persisted to local storage with a 60s stale window,
 * so a plain reload can re-render the values the page itself just wrote. Only a
 * reload with no cache to fall back on proves the value came from the API. The
 * session lives in an httpOnly cookie, so clearing storage does not sign the
 * reader out.
 */
export async function reloadFromServer(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

/**
 * Opens a table row's action menu and clicks one item, surviving a re-render.
 *
 * The two-line version — click the trigger, click the item — is flaky, and not
 * for a reason a longer timeout fixes. The list refetches in the background (a
 * mutation settling, the query cache revalidating), the `<tr>` is replaced, and
 * the open menu goes with it. The only thing that recovers is opening the menu
 * again, which is what this does.
 */
export async function clickRowAction(
  page: Page,
  row: Locator,
  action: string | RegExp,
): Promise<void> {
  const attempts = 2;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await row.getByRole('button', { name: 'Row actions' }).click();
      await page.getByRole('menuitem', { name: action }).click({ timeout: 10_000 });
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
}
