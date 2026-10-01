import type { AccessScope } from '@flama/backend-authz';
import { QueryBase } from '@flama/backend-ddd';

export class FindAccessGrantsQuery extends QueryBase {
  readonly scope: AccessScope;
  readonly page: number;
  readonly limit: number;

  constructor(props: { scope: AccessScope; page: number; limit: number }) {
    super();
    this.scope = props.scope;
    this.page = props.page;
    this.limit = props.limit;
  }
}
