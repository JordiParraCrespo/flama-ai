import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds tracked domains (`domain`).
 *
 * A domain is the attribution anchor the rest of the CRM hangs off: leads
 * record the domain they were captured on and search metrics roll up per
 * domain. Hostnames are unique **per organization**, not globally — two
 * workspaces may legitimately track the same public site.
 *
 * `ownerId` is `ON DELETE SET NULL`: removing a teammate must not delete the
 * domains they happened to own, it must leave them unassigned.
 *
 * Per-member domain access lives in the generic `user_resource_access` table —
 * see `AddResourceAccess`.
 */
export class AddDomains1781400000000 implements MigrationInterface {
  name = 'AddDomains1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "domain" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organizationId" uuid NOT NULL,
        "hostname" character varying(253) NOT NULL,
        "protocol" character varying(8) NOT NULL DEFAULT 'https',
        "status" character varying(16) NOT NULL DEFAULT 'draft',
        "ownerId" uuid,
        "importSearchConsole" boolean NOT NULL DEFAULT true,
        "runInitialCrawl" boolean NOT NULL DEFAULT true,
        "verifiedAt" TIMESTAMP,
        "lastCrawledAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_domain" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_domain_organization_hostname" UNIQUE ("organizationId", "hostname")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "domain" ADD CONSTRAINT "FK_domain_organization"
        FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "domain" ADD CONSTRAINT "FK_domain_owner"
        FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_domain_organization" ON "domain" ("organizationId")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_domain_owner" ON "domain" ("ownerId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_domain_owner"`);
    await queryRunner.query(`DROP INDEX "IDX_domain_organization"`);
    await queryRunner.query(`DROP TABLE "domain"`);
  }
}
