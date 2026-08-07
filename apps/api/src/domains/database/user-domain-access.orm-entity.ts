import { CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Join table restricting a user to specific domains (many-to-many).
 *
 * Absence of any row for a user means "unrestricted" — their role's `Domain`
 * permission applies workspace-wide. A user with rows here is narrowed to
 * exactly those domains, which is what the design's "All domains" vs
 * "3 domains" member column reflects. `AbilityFactory` turns the rows into a
 * CASL `{ id: { $in: [...] } }` condition on the `Domain` subject.
 *
 * Foreign keys + cascade deletes are declared in the migration.
 */
@Entity('user_domain_access')
@Index(['userId'])
@Index(['domainId'])
export class UserDomainAccessOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid' })
  domainId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
