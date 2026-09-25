import { expect, test } from '@playwright/test';
import { expectProblemDocument, signedUpContext } from '../../support/auth';
import { createOrganization } from '../../support/web';

/**
 * `GET /v1/organizations/:orgId/members/me` answers for the organization in the
 * path.
 *
 * It used to answer for the session's *active* organization and ignore the
 * path, so a caller in two workspaces got the wrong membership, and a token
 * restricted to one organization could read the caller's membership in
 * another. The OpenAPI document also left `orgId` out, so the generated client
 * could not send it.
 */
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
