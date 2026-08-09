import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Scopes the seeded `user` role's `User` permissions to the caller's own record.
 *
 * The role was seeded with unconditional `read User` and `update User`, which
 * made every account readable and writable by every other account: any
 * signed-in user could enumerate the whole directory and `PATCH` anyone —
 * including setting `role`, which the Better Auth admin plugin honours, so the
 * write was a route to full admin. The `ApiToken` rules added later already use
 * the `${user.id}` condition; this brings `User` in line with them.
 *
 * Idempotent and non-destructive in the same way as the ApiToken migration:
 * only the two rules being replaced are filtered out, so anything an admin has
 * since added to the role survives, and re-running changes nothing.
 */
export class ScopeUserRoleToOwnRecord1781700000000 implements MigrationInterface {
  name = 'ScopeUserRoleToOwnRecord1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "role"
          SET "permissions" = (
                SELECT COALESCE(jsonb_agg(rule), '[]'::jsonb)
                  FROM jsonb_array_elements("permissions") AS rule
                 WHERE NOT (rule->>'subject' = 'User'
                            AND rule->>'action' IN ('read', 'update')
                            AND rule->'conditions' IS NULL)
              )
              || '[{"action":"read","subject":"User","conditions":{"id":"\${user.id}"}},
                    {"action":"update","subject":"User","conditions":{"id":"\${user.id}"}}]'::jsonb
        WHERE "name" = 'user'`,
    );
  }

  /**
   * Restores the unconditional rules. This reopens the escalation path, so it
   * exists only to make the migration reversible — it is not a state any
   * deployment should sit in.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "role"
          SET "permissions" = (
                SELECT COALESCE(jsonb_agg(rule), '[]'::jsonb)
                  FROM jsonb_array_elements("permissions") AS rule
                 WHERE NOT (rule->>'subject' = 'User'
                            AND rule->>'action' IN ('read', 'update'))
              )
              || '[{"action":"read","subject":"User"},
                    {"action":"update","subject":"User"}]'::jsonb
        WHERE "name" = 'user'`,
    );
  }
}
