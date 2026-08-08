import type { AccessScope } from '@flama/backend-authz';
import { QueryBase } from '@flama/backend-ddd';

export class FindAccessGrantsQuery extends QueryBase {
  readonly scope: AccessScope;

  constructor(props: { scope: AccessScope }) {
    super();
    this.scope = props.scope;
  }
}
