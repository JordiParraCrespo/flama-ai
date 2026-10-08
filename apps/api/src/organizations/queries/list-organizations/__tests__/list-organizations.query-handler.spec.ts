import type { IncomingHttpHeaders } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListOrganizationsQuery } from '../list-organizations.query';
import { ListOrganizationsQueryHandler } from '../list-organizations.query-handler';

const headers: IncomingHttpHeaders = { cookie: 'session=abc' };
const organization = (id: string) => ({
  id,
  name: id,
  slug: id,
  logo: null,
  metadata: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
});

describe('ListOrganizationsQueryHandler', () => {
  const organizations = { list: vi.fn(), session: vi.fn() };
  let handler: ListOrganizationsQueryHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    organizations.list.mockResolvedValue([organization('org1'), organization('org2')]);
    handler = new ListOrganizationsQueryHandler(organizations as never);
  });

  it('keeps Better Auth’s order when the session has no organization selected', async () => {
    organizations.session.mockResolvedValue(null);
    const result = await handler.execute(new ListOrganizationsQuery({ headers }));
    expect(result.map((o) => o.id)).toEqual(['org1', 'org2']);
  });

  it('puts the session active organization first for organization-aware screens', async () => {
    organizations.session.mockResolvedValue({
      userId: 'u1',
      email: 'u1@x.com',
      activeOrganizationId: 'org2',
    });
    const result = await handler.execute(new ListOrganizationsQuery({ headers }));
    expect(result.map((o) => o.id)).toEqual(['org2', 'org1']);
  });
});
