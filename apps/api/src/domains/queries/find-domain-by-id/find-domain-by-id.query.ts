import { QueryBase } from '@flama/backend-ddd';

export class FindDomainByIdQuery extends QueryBase {
  readonly domainId: string;
  readonly organizationId: string;

  constructor(props: { domainId: string; organizationId: string }) {
    super();
    this.domainId = props.domainId;
    this.organizationId = props.organizationId;
  }
}
