import { expect, test } from '@playwright/test';
import { expectProblemDocument, signedUpContext } from '../../support/auth';
import { query } from '../../support/db';
import { createOrganization } from '../../support/organizations';

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

test.describe('deleting an organization', () => {
  /**
   * The API's delete is Better Auth's, which removes the organization row and
   * nothing the app keeps beside it; the schema has to take those with it, or
   * a former owner keeps a role, and a session keeps pointing, at nothing.
   */
  test('leaves no org-scoped role or session selection behind', async () => {
    const { api, userId } = await signedUpContext('deleteowner');
    const organizationId = await createOrganization(api, 'Short-lived');
    const activated = await api.post(`/api/v1/organizations/${organizationId}/set-active`);
    expect(activated.ok(), 'selecting the workspace should succeed').toBe(true);

    const deleted = await api.delete(`/api/v1/organizations/${organizationId}`);
    expect(deleted.status()).toBe(200);

    const [{ roles }] = await query<{ roles: number }>(
      `SELECT count(*)::int AS roles FROM "user_role" WHERE "organizationId" = $1`,
      [organizationId],
    );
    expect(roles).toBe(0);
    const sessions = await query<{ activeOrganizationId: string | null }>(
      `SELECT "activeOrganizationId" FROM "session" WHERE "userId" = $1`,
      [userId],
    );
    expect(sessions.map((s) => s.activeOrganizationId)).not.toContain(organizationId);

    await api.dispose();
  });
});
