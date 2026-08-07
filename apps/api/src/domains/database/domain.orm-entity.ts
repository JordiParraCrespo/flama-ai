import type { DomainProtocol, DomainStatus } from '@flama/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Persistence model for a tracked domain. This is infrastructure — the domain
 * `DomainEntity` is mapped to/from this record by `DomainMapper`.
 *
 * A hostname is unique per organization, not globally: two workspaces may each
 * track the same public site. Foreign keys and cascade behaviour are declared
 * in the migration.
 */
@Entity('domain')
@Unique('UQ_domain_organization_hostname', ['organizationId', 'hostname'])
@Index(['organizationId'])
@Index(['ownerId'])
export class DomainOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 253 })
  hostname!: string;

  @Column({ type: 'varchar', length: 8, default: 'https' })
  protocol!: DomainProtocol;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: DomainStatus;

  /** Nulled rather than cascade-deleted when the owning user is removed. */
  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null;

  @Column({ type: 'boolean', default: true })
  importSearchConsole!: boolean;

  @Column({ type: 'boolean', default: true })
  runInitialCrawl!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastCrawledAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
