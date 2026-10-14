import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Two-factor authentication (Better Auth's `twoFactor` plugin): an
 * authenticator app (TOTP) plus single-use backup codes.
 *
 * `user."twoFactorEnabled"` is the plugin's own field: it is what the sign-in
 * hook reads to decide whether a correct password is enough. It turns true
 * only once the user has confirmed a code from their app, so an enrolment
 * abandoned halfway never locks anyone out. `NOT NULL DEFAULT false` is a
 * catalog-only change on Postgres 11+, safe on a populated `user`.
 *
 * `twoFactor` holds the enrolment, one row per user. Better Auth replaces the
 * row each time enrolment starts again, and deletes it when two-factor is
 * turned off. The unique key on `"userId"` is what makes "the user's
 * enrolment" one row: the plugin looks it up with `findOne` by user, and two
 * rows from a double-clicked "enable" would verify against whichever it read
 * first. It also serves that lookup (every sign-in of a 2FA user, every
 * verification) and the cascade from `user`.
 *
 * `secret` and `backupCodes` arrive encrypted by Better Auth, which is why
 * they are `text` with no length limit: the ciphertext's length is the
 * library's business. `verified` defaults to false, the safe reading of a row
 * nothing vouched for; Better Auth always writes it explicitly anyway.
 * `failedVerificationCount` and `lockedUntil` back the plugin's account
 * lockout (ten failed codes lock the account's second factor for fifteen
 * minutes).
 *
 * There is no `"updatedAt"`: Better Auth writes every change to this row and
 * does not know the column, so it would only ever repeat `"createdAt"`.
 *
 * The sign-in challenge in between (password accepted, code still owed) lives
 * in `verification` as a `2fa-<random>` row that expires in ten minutes, and
 * "trust this device" as a `trust-device-<random>` row that expires in thirty
 * days; both are deleted on read once expired, like every verification row.
 *
 * Retention: a row lives exactly as long as the enrolment, and goes with its
 * user.
 */
export class AddTwoFactor1789300000000 implements MigrationInterface {
  name = 'AddTwoFactor1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "twoFactor" (
        "id" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "secret" text NOT NULL,
        "backupCodes" text NOT NULL,
        "verified" boolean NOT NULL DEFAULT false,
        "failedVerificationCount" integer NOT NULL DEFAULT 0,
        "lockedUntil" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_twoFactor" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_twoFactor_userId" UNIQUE ("userId"),
        CONSTRAINT "FK_twoFactor_user" FOREIGN KEY ("userId")
          REFERENCES "user"("id") ON DELETE CASCADE
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "twoFactor"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "twoFactorEnabled"`);
  }
}
