import type { IncomingHttpHeaders } from 'node:http';
import { QueryBase } from '@flama/backend-ddd';
import type { MemberFilters } from '../../domain/member-search.policy';

export class ListMembersQuery extends QueryBase {
  readonly headers: IncomingHttpHeaders;
  readonly organizationId: string;
  readonly filters: MemberFilters;

  constructor(props: {
    headers: IncomingHttpHeaders;
    organizationId: string;
    filters: MemberFilters;
  }) {
    super();
    this.headers = props.headers;
    this.organizationId = props.organizationId;
    this.filters = props.filters;
  }
}
