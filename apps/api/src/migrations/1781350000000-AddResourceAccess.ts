import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `user_resource_access` — per-instance access control, generic over the
 * resource type.
 *
 * Absence of any row for a `(userId, organizationId, resourceType)` triple
 * means **unrestricted** for that type in that organization; rows narrow the
 * user to exactly the listed ids. That default means adding this table grants
 * and revokes nothing on its own, so no backfill is needed.
 *
 * `resourceId` deliberately has **no foreign key**: the table is polymorphic
 * and must not know about `domain`, `lead` or anything else. Nothing cascades,
 * so the owning module revokes grants from its own removal event handler —
 * otherwise an orphaned row could hand a recycled id an old grant.
 *
 * `organizationId` is denormalized for the same reason. With no table to join,
 * there is nowhere else to derive the tenant from, and resources do not move
 * between organizations.
 */
export class AddResourceAccess1781350000000 implements MigrationInterface {
  name = 'AddResourceAccess1781350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_resource_access" (
        "userId" uuid NOT NULL,
        "resourceType" character varying(64) NOT NULL,
        "resourceId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_resource_access" PRIMARY KEY ("userId", "resourceType", "resourceId")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_resource_access" ADD CONSTRAINT "FK_user_resource_access_user"
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_resource_access" ADD CONSTRAINT "FK_user_resource_access_organization"
        FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_user_resource_access_user" ON "user_resource_access" ("userId")`,
    );
    // The listing filter and the write both key on this triple.
    await queryRunner.query(
      `CREATE INDEX "IDX_user_resource_access_scope" ON "user_resource_access"
        ("userId", "organizationId", "resourceType")`,
    );
    // Revoking every grant on a deleted resource.
    await queryRunner.query(
      `CREATE INDEX "IDX_user_resource_access_resource" ON "user_resource_access"
        ("resourceType", "resourceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_resource_access_resource"`);
    await queryRunner.query(`DROP INDEX "IDX_user_resource_access_scope"`);
    await queryRunner.query(`DROP INDEX "IDX_user_resource_access_user"`);
    await queryRunner.query(`DROP TABLE "user_resource_access"`);
  }
}
