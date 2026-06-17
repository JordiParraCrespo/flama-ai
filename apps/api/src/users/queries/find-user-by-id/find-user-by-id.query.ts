import { QueryBase } from '@flama/backend-ddd';

export class FindUserByIdQuery extends QueryBase {
  readonly userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }
}
