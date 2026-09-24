import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Maps the Better Auth `session` table. Owned by Better Auth; declared here so
 * TypeORM creates/migrates the table alongside the rest of the schema.
 * `userId` references `user` (`FK_session_user`, ON DELETE CASCADE); the
 * foreign key lives in the migration, as for every entity here.
 */
@Entity('session')
@Unique('UQ_session_token', ['token'])
@Index('IDX_session_userId', ['userId'])
export class Session {
  @PrimaryColumn({ type: 'uuid', primaryKeyConstraintName: 'PK_session' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  token!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent!: string | null;

  /**
   * True for the internal sessions `DelegatedSessionAdapter` mints so an API
   * token or OAuth client can reach the Better Auth façades. They are bridges,
   * not devices, so the profile session list leaves them out.
   *
   * Declared to Better Auth as a session `additionalField` in `auth.ts` — it
   * owns every write to this table, and a column it does not know about would
   * be dropped on the way in.
   */
  @Column({ type: 'boolean', default: false })
  delegated!: boolean;

  /** The credential a delegated session was minted for; null for devices. */
  @Column({ type: 'varchar', nullable: true })
  delegatedCredentialId!: string | null;

  // --- Better Auth admin plugin: set while an admin impersonates a user. ---
  @Column({ type: 'uuid', nullable: true })
  impersonatedBy!: string | null;

  // --- Better Auth organization plugin: the session's active org/workspace. ---
  @Column({ type: 'uuid', nullable: true })
  activeOrganizationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  activeTeamId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
