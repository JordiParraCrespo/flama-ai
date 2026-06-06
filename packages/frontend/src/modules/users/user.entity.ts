import type { Role } from "@flama/shared";

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: Role,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isAdmin(): boolean {
    return this.role === "admin";
  }
}
