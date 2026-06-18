import { CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Join table linking Better Auth users to application roles (many-to-many).
 * A user's effective permissions are the union of every role referenced here.
 * Foreign keys + cascade deletes are declared in the migration.
 */
@Entity('user_role')
@Index(['userId'])
export class UserRoleOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid' })
  roleId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
