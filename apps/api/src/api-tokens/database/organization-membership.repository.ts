import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { OrganizationMembershipReaderPort } from './organization-membership.repository.port';

/**
 * Reads the Better Auth `member` table directly rather than through the
 * organizations module's entity, so API tokens do not depend on that module.
 * A project that pruned organizations still has the table (its migrations
 * stay) and simply has no rows in it, so every restriction is refused.
 */
@Injectable()
export class OrganizationMembershipRepository implements OrganizationMembershipReaderPort {
  constructor(private readonly dataSource: DataSource) {}

  async findOrganizationIdsForUser(userId: string): Promise<string[]> {
    const rows: { organizationId: string }[] = await this.dataSource.query(
      'SELECT "organizationId" FROM "member" WHERE "userId" = $1',
      [userId],
    );
    return rows.map((row) => row.organizationId);
  }
}
