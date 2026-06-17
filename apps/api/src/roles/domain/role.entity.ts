import { randomUUID } from 'node:crypto';
import {
  AggregateRoot,
  ArgumentNotProvidedException,
  type CreateEntityProps,
} from '@flama/backend-ddd';
import { RoleDeletedDomainEvent } from './events/role-deleted.domain-event';
import { Permission } from './value-objects/permission.value-object';

export interface RoleProps {
  /** Unique, immutable, machine-readable name (e.g. `editor`, `support`). */
  name: string;
  description: string | null;
  /** System roles (`admin`, `user`) are seeded and cannot be deleted/renamed. */
  isSystem: boolean;
  permissions: Permission[];
}

export interface CreateRoleProps {
  name: string;
  description?: string | null;
  permissions?: Permission[];
}

/**
 * Role aggregate root. Owns its set of {@link Permission} value objects and the
 * invariants protecting the platform's built-in roles. The union of every role
 * assigned to a user determines that user's effective CASL ability.
 */
export class RoleEntity extends AggregateRoot<RoleProps> {
  /** Rehydrate an existing role (used by the mapper). */
  static create(create: CreateEntityProps<RoleProps>): RoleEntity {
    return new RoleEntity(create);
  }

  /** Create a brand-new, non-system role with a generated id. */
  static createNew(props: CreateRoleProps): RoleEntity {
    return new RoleEntity({
      id: randomUUID(),
      props: {
        name: props.name,
        description: props.description ?? null,
        isSystem: false,
        permissions: props.permissions ?? [],
      },
    });
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get permissions(): Permission[] {
    return this.props.permissions;
  }

  updateDescription(description: string | null): void {
    this.props.description = description ?? null;
    this.setUpdatedAt(new Date());
    this.validate();
  }

  /** Replace the role's full permission set (granular permission editing). */
  replacePermissions(permissions: Permission[]): void {
    this.props.permissions = permissions;
    this.setUpdatedAt(new Date());
    this.validate();
  }

  /**
   * Mark the role for deletion. The system-role guard lives in the application
   * handler (the domain stays free of the `AppError` catalog).
   */
  delete(): void {
    this.addEvent(
      new RoleDeletedDomainEvent({
        aggregateId: this.id,
        name: this.props.name,
      }),
    );
  }

  public validate(): void {
    if (!this.props.name?.trim()) {
      throw new ArgumentNotProvidedException('Role name cannot be empty');
    }
  }
}
