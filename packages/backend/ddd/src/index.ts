export { AggregateRoot } from './aggregate-root.base';
export {
  CommandBase,
  type CommandMetadata,
  type CommandProps,
} from './command.base';
export {
  DomainEvent,
  type DomainEventMetadata,
  type DomainEventProps,
} from './domain-event.base';
export {
  type AggregateID,
  type BaseEntityProps,
  type CreateEntityProps,
  Entity,
} from './entity.base';
export {
  ArgumentInvalidException,
  ArgumentNotProvidedException,
  ArgumentOutOfRangeException,
  ConflictException,
  ExceptionBase,
  NotFoundException,
} from './exceptions';
export { Guard } from './guard';
export type { Mapper } from './mapper.interface';
export { QueryBase } from './query.base';
export {
  type OrderBy,
  Paginated,
  type PaginatedQueryParams,
  type RepositoryPort,
} from './repository.port';
export { convertPropsToObject } from './utils';
export {
  type DomainPrimitive,
  type Primitives,
  ValueObject,
} from './value-object.base';
