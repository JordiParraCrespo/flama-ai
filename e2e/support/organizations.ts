import { type APIRequestContext, expect } from '@playwright/test';

/** Organizations through the API, for the specs that need one to exist. */

export const ORGANIZATION_NAME = 'E2E Workspace';

/** `POST /v1/organizations` as the context's user; returns the new id. */
export async function createOrganization(
  api: APIRequestContext,
  name = ORGANIZATION_NAME,
): Promise<string> {
  const response = await api.post('/api/v1/organizations', { data: { name } });
  expect(response.status(), `creating the workspace "${name}" should succeed`).toBe(201);
  const body = (await response.json()) as { id: string };
  return body.id;
}

/** Invites `email` into the organization and returns the invitation id. */
export async function inviteByApi(
  api: APIRequestContext,
  organizationId: string,
  email: string,
  role: 'owner' | 'admin' | 'member' = 'member',
): Promise<string> {
  const response = await api.post(`/api/v1/organizations/${organizationId}/invitations`, {
    data: { email, role },
  });
  expect(response.status(), `inviting ${email} should succeed`).toBe(201);
  return ((await response.json()) as { id: string }).id;
}
