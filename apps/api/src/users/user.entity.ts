import type { Role } from "@flama/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Maps the Better Auth `user` table. Better Auth owns writes to this table
 * (sign-up, OAuth, verification); the application reads/updates it through
 * TypeORM for the `/users` endpoints.
 *
 * `firstName`, `lastName`, `role` and `isActive` are Better Auth
 * "additional fields" declared in `auth.ts`.
 */
@Entity("user")
export class User {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "boolean", default: false })
  emailVerified!: boolean;

  @Column({ type: "varchar", nullable: true })
  image!: string | null;

  @Column({ type: "varchar" })
  firstName!: string;

  @Column({ type: "varchar" })
  lastName!: string;

  @Column({ type: "varchar", default: "user" })
  role!: Role;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
