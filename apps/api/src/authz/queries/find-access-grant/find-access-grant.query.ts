import type { AccessScope } from '@flama/backend-authz';
import { QueryBase } from '@flama/backend-ddd';

export class FindAccessGrantQuery extends QueryBase {
  readonly scope: AccessScope;
  readonly grantId: string;

  constructor(props: { scope: AccessScope; grantId: string }) {
    super();
    this.scope = props.scope;
    this.grantId = props.grantId;
  }
}
