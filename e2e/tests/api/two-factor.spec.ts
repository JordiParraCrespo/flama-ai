import { type APIRequestContext, expect, test } from '@playwright/test';
import { getSession, newContext, signedUpContext, signIn, signOut } from '../../support/auth';
import { totpCode, totpSecretOf } from '../../support/totp';

/**
 * Two-factor authentication (Better Auth's `twoFactor` plugin), through the
 * endpoints the web and mobile clients call. What matters is what a correct
 * password alone does and does not get once two-factor is on.
 */

async function enable(api: APIRequestContext, password: string) {
  const response = await api.post('/api/auth/two-factor/enable', {
    data: { password },
    failOnStatusCode: false,
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as { totpURI: string; backupCodes: string[] };
}

function verifyTotp(api: APIRequestContext, code: string, trustDevice = false) {
  return api.post('/api/auth/two-factor/verify-totp', {
    data: { code, trustDevice },
    failOnStatusCode: false,
  });
}

/** An account with two-factor confirmed, and its secret. */
async function enrolledUser(prefix: string) {
  const { api, user, userId } = await signedUpContext(prefix);
  const enrolment = await enable(api, user.password);
  const secret = totpSecretOf(enrolment.totpURI);
  expect((await verifyTotp(api, totpCode(secret))).status()).toBe(200);
  await signOut(api);
  await api.dispose();
  return { user, userId, secret, backupCodes: enrolment.backupCodes };
}

test('an enrolment that is never confirmed changes nothing about sign-in', async () => {
  const { api, user } = await signedUpContext('2fa-unconfirmed');
  await enable(api, user.password);
  await signOut(api);

  const response = await signIn(api, user.email, user.password);
  expect(response.status()).toBe(200);
  expect(await response.json()).not.toHaveProperty('twoFactorRedirect');
  expect((await (await getSession(api)).json())?.user?.email).toBe(user.email);

  await api.dispose();
});

test('enabling asks for the password', async () => {
  const { api } = await signedUpContext('2fa-password');

  const response = await api.post('/api/auth/two-factor/enable', {
    data: { password: 'not-the-password-1' },
    failOnStatusCode: false,
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).code).toBe('INVALID_PASSWORD');

  await api.dispose();
});

test('a correct password alone opens no session once two-factor is on', async () => {
  const { user, secret } = await enrolledUser('2fa-challenge');
  const api = await newContext();

  const response = await signIn(api, user.email, user.password);
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ twoFactorRedirect: true });
  expect(await (await getSession(api)).json()).toBeNull();

  const wrong = await verifyTotp(api, '000000');
  expect(wrong.status()).toBe(401);
  expect((await wrong.json()).code).toBe('INVALID_CODE');
  expect(await (await getSession(api)).json()).toBeNull();

  expect((await verifyTotp(api, totpCode(secret))).status()).toBe(200);
  expect((await (await getSession(api)).json())?.user?.email).toBe(user.email);

  await api.dispose();
});

test('a code without the password step first is refused', async () => {
  const { secret } = await enrolledUser('2fa-nocookie');
  const api = await newContext();

  const response = await verifyTotp(api, totpCode(secret));
  expect(response.status()).toBe(401);
  expect(await (await getSession(api)).json()).toBeNull();

  await api.dispose();
});

test('a backup code signs in once', async () => {
  const { user, backupCodes } = await enrolledUser('2fa-backup');
  const [code] = backupCodes;

  const first = await newContext();
  await signIn(first, user.email, user.password);
  const used = await first.post('/api/auth/two-factor/verify-backup-code', {
    data: { code },
    failOnStatusCode: false,
  });
  expect(used.status()).toBe(200);
  expect((await (await getSession(first)).json())?.user?.email).toBe(user.email);

  const second = await newContext();
  await signIn(second, user.email, user.password);
  const reused = await second.post('/api/auth/two-factor/verify-backup-code', {
    data: { code },
    failOnStatusCode: false,
  });
  expect(reused.status()).toBe(401);
  expect(await (await getSession(second)).json()).toBeNull();

  await first.dispose();
  await second.dispose();
});

test('turning two-factor off makes the password enough again', async () => {
  const { user, secret } = await enrolledUser('2fa-disable');
  const api = await newContext();
  await signIn(api, user.email, user.password);
  await verifyTotp(api, totpCode(secret));

  const disabled = await api.post('/api/auth/two-factor/disable', {
    data: { password: user.password },
    failOnStatusCode: false,
  });
  expect(disabled.status()).toBe(200);
  await signOut(api);

  const response = await signIn(api, user.email, user.password);
  expect(await response.json()).not.toHaveProperty('twoFactorRedirect');
  expect((await (await getSession(api)).json())?.user?.email).toBe(user.email);

  await api.dispose();
});

test('the profile reports the enrolment', async () => {
  const { user, secret } = await enrolledUser('2fa-profile');
  const api = await newContext();
  await signIn(api, user.email, user.password);
  await verifyTotp(api, totpCode(secret));

  const profile = await api.get('/api/v1/profile', { failOnStatusCode: false });
  expect(profile.status()).toBe(200);
  expect((await profile.json()).twoFactorEnabled).toBe(true);

  await api.dispose();
});
