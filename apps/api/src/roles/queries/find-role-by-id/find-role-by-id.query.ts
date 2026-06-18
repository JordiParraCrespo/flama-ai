import { QueryBase } from '@flama/backend-ddd';

export class FindRoleByIdQuery extends QueryBase {
  readonly roleId: string;

  constructor(roleId: string) {
    super();
    this.roleId = roleId;
  }
}
