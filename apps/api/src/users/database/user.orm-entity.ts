import type { Role } from '@flama/shared';
import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';

/**
 * Persistence model for the Better Auth `user` table. This is infrastructure —
 * the domain `UserEntity` is mapped to/from this record by `UserMapper`.
 *
 * Better Auth owns writes to identity columns (sign-up, OAuth, verification);
 * the application reads/updates the profile columns through TypeORM for the
 * `/users` endpoints. `firstName`, `lastName`, `phone`, `jobTitle`, `role` and
 * `isActive` are Better Auth "additional fields" declared in `auth.ts`.
 */
@Entity('user')
@Unique('UQ_user_email', ['email'])
export class UserOrmEntity {
  @PrimaryColumn({ type: 'uuid', primaryKeyConstraintName: 'PK_user' })
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', nullable: true })
  image!: string | null;

  @Column({ type: 'varchar' })
  firstName!: string;

  @Column({ type: 'varchar' })
  lastName!: string;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  jobTitle!: string | null;

  @Column({ type: 'varchar', default: 'user' })
  role!: Role;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // --- Better Auth admin plugin (super-admin / moderation) ---

  @Column({ type: 'boolean', default: false })
  banned!: boolean;

  @Column({ type: 'varchar', nullable: true })
  banReason!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  banExpires!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
