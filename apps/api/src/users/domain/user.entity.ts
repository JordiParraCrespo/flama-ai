import {
  AggregateRoot,
  ArgumentNotProvidedException,
  type CreateEntityProps,
} from '@flama/backend-ddd';
import type { Role } from '@flama/shared';
import { UserDeletedDomainEvent } from './events/user-deleted.domain-event';
import { Email } from './value-objects/email.value-object';

export interface UserProps {
  email: Email;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
}

export interface UpdateUserProps {
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
}

/**
 * User aggregate root. Holds the profile fields the application owns on the
 * Better Auth `user` record and protects their invariants. Identity, password
 * and OAuth links remain owned by Better Auth.
 */
export class UserEntity extends AggregateRoot<UserProps> {
  static create(create: CreateEntityProps<UserProps>): UserEntity {
    return new UserEntity(create);
  }

  get email(): string {
    return this.props.email.value;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get role(): Role {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  /** Apply a partial profile update, ignoring fields left undefined. */
  updateProfile(props: UpdateUserProps): void {
    if (props.firstName !== undefined) this.props.firstName = props.firstName;
    if (props.lastName !== undefined) this.props.lastName = props.lastName;
    if (props.role !== undefined) this.props.role = props.role;
    if (props.isActive !== undefined) this.props.isActive = props.isActive;
    this.setUpdatedAt(new Date());
    this.validate();
  }

  /** Mark the user for deletion and raise the corresponding domain event. */
  delete(): void {
    this.addEvent(
      new UserDeletedDomainEvent({
        aggregateId: this.id,
        email: this.props.email.value,
      }),
    );
  }

  public validate(): void {
    if (!this.props.firstName) {
      throw new ArgumentNotProvidedException('User firstName cannot be empty');
    }
    if (!this.props.lastName) {
      throw new ArgumentNotProvidedException('User lastName cannot be empty');
    }
  }
}
