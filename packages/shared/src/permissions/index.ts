import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { Role } from '../types';

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type Subjects = 'User' | 'Article' | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function defineAbilitiesFor(role: Role): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (role) {
    case 'admin':
      can('manage', 'all');
      break;
    case 'user':
      can('read', 'User');
      can('update', 'User');
      can('read', 'Article');
      can('create', 'Article');
      break;
  }

  return build();
}
