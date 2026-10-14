import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique } from 'typeorm';

/**
 * Maps the Better Auth `twoFactor` table (two-factor plugin): one row per user
 * who has started enrolling an authenticator app. Owned by Better Auth;
 * declared here so TypeORM knows the table. `userId` references `user`
 * (`FK_twoFactor_user`, ON DELETE CASCADE); the foreign key lives in the
 * migration (`AddTwoFactor`), as for every entity here.
 *
 * `secret` and `backupCodes` are encrypted by Better Auth with
 * `BETTER_AUTH_SECRET` before they are written, so rotating that secret makes
 * every enrolment unreadable.
 */
@Entity('twoFactor')
@Unique('UQ_twoFactor_userId', ['userId'])
export class TwoFactor {
  @PrimaryColumn({ type: 'uuid', primaryKeyConstraintName: 'PK_twoFactor' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  secret!: string;

  @Column({ type: 'text' })
  backupCodes!: string;

  /** False until the first code from the authenticator app is confirmed. */
  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @Column({ type: 'integer', default: 0 })
  failedVerificationCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
