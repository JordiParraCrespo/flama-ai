import type { PermissionDefinition } from '@flama/shared';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Persistence model for the application-owned `role` table. The domain
 * `RoleEntity` is mapped to/from this record by `RoleMapper`. Permissions are
 * stored inline as a `jsonb` array — the role aggregate owns them, so they are
 * always read and written together.
 */
@Entity('role')
export class RoleOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', unique: true })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  permissions!: PermissionDefinition[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
