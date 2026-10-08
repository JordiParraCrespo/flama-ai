import { QueryBase } from '@flama/backend-ddd';

export class FindOrganizationQuery extends QueryBase {
  readonly organizationId: string;

  constructor(props: { organizationId: string }) {
    super();
    this.organizationId = props.organizationId;
  }
}
