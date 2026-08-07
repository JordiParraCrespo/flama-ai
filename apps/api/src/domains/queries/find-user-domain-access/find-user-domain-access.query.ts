import { QueryBase } from '@flama/backend-ddd';

export class FindUserDomainAccessQuery extends QueryBase {
  readonly userId: string;
  readonly organizationId: string;

  constructor(props: { userId: string; organizationId: string }) {
    super();
    this.userId = props.userId;
    this.organizationId = props.organizationId;
  }
}
