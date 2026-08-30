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
 * **Narrows; never grants.** Each rule is rewritten in place rather than the
 * pair being filtered out and re-appended. Roles are admin-managed, so a
 * deployment where someone deliberately removed `update User` must not have it
 * handed back by an upgrade — appending would do exactly that. Rewriting also
 * leaves a rule an admin has already given its own `conditions` untouched, and
 * preserves the order of the array, so the only observable change is the two
 * unconditional rules gaining their scope.
 *
 * Idempotent: a second run finds no unconditional `User` rules left to rewrite.
 */
export class ScopeUserRoleToOwnRecord1781700000000 implements MigrationInterface {
  name = 'ScopeUserRoleToOwnRecord1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "role"
          SET "permissions" = (
                SELECT COALESCE(jsonb_agg(
                         CASE
                           WHEN rule->>'subject' = 'User'
                            AND rule->>'action' IN ('read', 'update')
                            AND rule->'conditions' IS NULL
                           THEN rule || '{"conditions":{"id":"\${user.id}"}}'::jsonb
                           ELSE rule
                         END
                         ORDER BY position
                       ), '[]'::jsonb)
                  FROM jsonb_array_elements("permissions")
                       WITH ORDINALITY AS element(rule, position)
              )
        WHERE "name" = 'user'`,
    );
  }

  /**
   * Removes the condition this migration added, leaving the rule itself in
   * place. Reverting reopens the escalation path, so it exists only to make the
   * migration reversible — it is not a state a deployment should sit in.
   *
   * Matched on the exact condition written above so a scope an admin set
   * themselves is left alone.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "role"
          SET "permissions" = (
                SELECT COALESCE(jsonb_agg(
                         CASE
                           WHEN rule->>'subject' = 'User'
                            AND rule->>'action' IN ('read', 'update')
                            AND rule->'conditions' = '{"id":"\${user.id}"}'::jsonb
                           THEN rule - 'conditions'
                           ELSE rule
                         END
                         ORDER BY position
                       ), '[]'::jsonb)
                  FROM jsonb_array_elements("permissions")
                       WITH ORDINALITY AS element(rule, position)
              )
        WHERE "name" = 'user'`,
    );
  }
}
