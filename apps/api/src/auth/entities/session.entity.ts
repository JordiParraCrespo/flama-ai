import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Maps the Better Auth `session` table. Owned by Better Auth; declared here so
 * TypeORM creates/migrates the table alongside the rest of the schema.
 */
@Entity('session')
export class Session {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', unique: true })
  token!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent!: string | null;

  // --- Better Auth admin plugin: set while an admin impersonates a user. ---
  @Column({ type: 'uuid', nullable: true })
  impersonatedBy!: string | null;

  // --- Better Auth organization plugin: the session's active org/workspace. ---
  @Column({ type: 'uuid', nullable: true })
  activeOrganizationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  activeTeamId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
