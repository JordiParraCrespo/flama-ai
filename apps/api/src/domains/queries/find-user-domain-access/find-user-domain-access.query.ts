import { QueryBase } from '@flama/backend-ddd';

export class FindUserDomainAccessQuery extends QueryBase {
  readonly userId: string;

  constructor(props: { userId: string }) {
    super();
    this.userId = props.userId;
  }
}
