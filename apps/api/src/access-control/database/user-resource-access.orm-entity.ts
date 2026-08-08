import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Restricts a user to specific instances of a resource type.
 *
 * Absence of any row for a `(userId, organizationId, resourceType)` triple means
 * **unrestricted** for that type in that organization: the user's role applies
 * to every instance. Rows narrow them to exactly the listed ids. That default
 * keeps the common case (and every pre-existing user) working without a
 * backfill, and makes granting narrowed access an explicit act.
 *
 * `resourceId` is polymorphic and therefore carries **no foreign key** — the
 * whole point is that the table does not know about `domain`, `lead` or
 * anything else. Cleanup when a resource is deleted is explicit: the owning
 * module calls `deleteForResource` from its removal event handler. Without a
 * row referencing a live resource, a recycled id could otherwise inherit an old
 * grant.
 *
 * `organizationId` is denormalized for the same reason: with no table to join,
 * there is nowhere else to derive the tenant from. Resources do not move
 * between organizations, so it cannot drift.
 */
@Entity('user_resource_access')
@Index(['userId'])
@Index(['userId', 'organizationId', 'resourceType'])
@Index(['resourceType', 'resourceId'])
export class UserResourceAccessOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  resourceType!: string;

  @PrimaryColumn({ type: 'uuid' })
  resourceId!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
