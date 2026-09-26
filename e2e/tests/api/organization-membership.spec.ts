import { expect, request, test } from '@playwright/test';
import { API_URL } from '../../playwright.config';
import { expectProblemDocument, signedUpContext } from '../../support/auth';
import { createOrganization } from '../../support/web';

test.describe("the caller's own membership", () => {
  test('is read from the organization in the path, not the active one', async () => {
    const { api, userId } = await signedUpContext('membershipme');
    const first = await createOrganization(api, 'First workspace');
    const second = await createOrganization(api, 'Second workspace');

    const activated = await api.post(`/api/v1/organizations/${first}/set-active`);
    expect(activated.ok(), 'selecting the first workspace should succeed').toBe(true);

    const response = await api.get(`/api/v1/organizations/${second}/members/me`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      organizationId: second,
      userId,
      role: 'owner',
    });

    await api.dispose();
  });

  test('is answered for a token pinned to no organization', async () => {
    const { api, userId } = await signedUpContext('membershiptoken');
    await createOrganization(api, 'First workspace');
    const second = await createOrganization(api, 'Second workspace');

    const minted = await api.post('/api/v1/tokens', {
      data: { name: 'membership e2e', scopes: ['members:read'] },
    });
    expect(minted.status(), 'minting an unrestricted token should succeed').toBe(201);
    const { token } = (await minted.json()) as { token: string };

    const bearer = await request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const response = await bearer.get(`/api/v1/organizations/${second}/members/me`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ organizationId: second, userId });

    await bearer.dispose();
    await api.dispose();
  });

  test('is refused for an organization the caller does not belong to', async () => {
    const owner = await signedUpContext('membershipowner');
    const elsewhere = await createOrganization(owner.api, 'Not yours');
    const { api } = await signedUpContext('membershipoutsider');
    await createOrganization(api, 'Yours');

    const response = await api.get(`/api/v1/organizations/${elsewhere}/members/me`, {
      failOnStatusCode: false,
    });
    await expectProblemDocument(response, { status: 403 });

    await owner.api.dispose();
    await api.dispose();
  });
});
