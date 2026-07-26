import { QueryBase } from '@flama/backend-ddd';

/** Lists the tokens belonging to one user, newest first. */
export class FindApiTokensQuery extends QueryBase {
  readonly userId: string;

  constructor(props: { userId: string }) {
    super();
    this.userId = props.userId;
  }
}
