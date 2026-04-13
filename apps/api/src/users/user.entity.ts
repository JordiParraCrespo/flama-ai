import type { AuthProvider, Role } from "@flama/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  password!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ default: "user" })
  role!: Role;

  @Column({ default: "local" })
  provider!: AuthProvider;

  @Column({ nullable: true })
  providerId!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true, type: "timestamp" })
  emailVerifiedAt!: Date | null;

  @Column({ nullable: true })
  resetPasswordToken!: string | null;

  @Column({ nullable: true, type: "timestamp" })
  resetPasswordExpires!: Date | null;

  @Column({ nullable: true })
  refreshToken!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
