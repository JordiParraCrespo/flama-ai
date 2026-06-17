import { QueryBase } from '@flama/backend-ddd';

export class FindUserRolesQuery extends QueryBase {
  readonly userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }
}
