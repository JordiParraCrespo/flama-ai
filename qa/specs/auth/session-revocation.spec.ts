import { findUser, sessionsOf, withDb } from '../../src/db.js';
import { scenario, signIn, WEB_URL } from '../../src/harness.js';
import { signUpThroughApi, TRANSIENT } from './accounts.js';

scenario('AUTH-07', async ({ page, qa }) => {
  const account = TRANSIENT.revokedMember;
  qa.check('the member can be created', await signUpThroughApi(page, account));

  // Two independent contexts, because the question is about another device. The
  // same context reloaded shares a cookie jar and would answer a different,
  // easier question.
  const second = await page
    .context()
    .browser()
    ?.newContext({
      baseURL: WEB_URL,
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
  const other = await second?.newPage();

  qa.check('the first device signs in', await signIn(page, account.email, account.password));
  if (other) {
    qa.check('the second device signs in', await signIn(other, account.email, account.password));
  }

  const user = await withDb((pool) => findUser(pool, account.email));
  const opened = user ? await withDb((pool) => sessionsOf(pool, user.id)) : 0;
  qa.note(`${opened} session row(s) after signing in on two devices`);
  qa.check('each sign-in issued its own session', opened >= 2, `${opened} session(s)`);

  // The cookie is the credential. A script that can read it can carry it away,
  // and no amount of revocation elsewhere helps once it has.
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((cookie) => /session/i.test(cookie.name));
  qa.check('a session cookie was set', Boolean(sessionCookie), sessionCookie?.name ?? 'none found');
  qa.check(
    'the session cookie is httpOnly, so a script on the page cannot read it',
    sessionCookie?.httpOnly === true,
    `httpOnly=${String(sessionCookie?.httpOnly)}`,
  );

  await page.goto('/dashboard');
  await page
    .getByRole('button', { name: /sign out|log out/i })
    .first()
    .click()
    .catch(async () => {
      // Some shells put it behind the account menu rather than on the page.
      await page
        .getByRole('button', { name: /account|profile|menu/i })
        .first()
        .click();
      await page
        .getByRole('menuitem', { name: /sign out|log out/i })
        .first()
        .click();
    });
  await page.waitForTimeout(2000);

  const afterSignOut = user ? await withDb((pool) => sessionsOf(pool, user.id)) : 0;
  qa.check(
    'signing out removes the session row, not only the cookie',
    afterSignOut < opened,
    `${opened} before, ${afterSignOut} after`,
  );

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle').catch(() => {});
  qa.check(
    'the signed-out device can no longer open the dashboard',
    page.url().includes('/login'),
    page.url(),
  );
  await qa.shot(page, 'auth-07-signed-out', 'The dashboard, asked for after signing out');

  if (other) {
    await other.goto('/dashboard');
    await other.waitForLoadState('networkidle').catch(() => {});
    qa.note(`the other device is at ${other.url()} after the first signed out`);
    // Signing out one device should not sign out the other: that is a different
    // promise from the one a password reset makes, and conflating them hides
    // whichever is broken.
    qa.check(
      "signing out on one device leaves the other's own session alone",
      !other.url().includes('/login'),
      other.url(),
    );
    await qa.shot(
      other,
      'auth-07-other-device-revoked',
      'The second device, after the first signed out',
    );
    await second?.close();
  }
});
