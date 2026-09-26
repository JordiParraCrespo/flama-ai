import type { Role } from '@flama/shared';

/**
 * The avatar fallback for someone with no picture: the first letter of each
 * name, upper-cased. One definition for every entity that names a person.
 */
export function personInitials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}

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

  /** Fallback for the avatar: the initials shown when there is no picture. */
  get initials(): string {
    return personInitials(this.firstName, this.lastName);
  }

  get isAdmin(): boolean {
    return this.platformRoles.includes('admin');
  }

  get isSuperAdmin(): boolean {
    return this.platformRoles.includes('superadmin');
  }

  get canAccessControlPlane(): boolean {
    return this.isAdmin || this.isSuperAdmin;
  }

  private get platformRoles(): string[] {
    return this.role
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
  }
}
