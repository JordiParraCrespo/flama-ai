import type { IncomingHttpHeaders } from 'node:http';
import { QueryBase } from '@flama/backend-ddd';
import type { ListUsersQuery as ListUsersFilter } from '@flama/shared';

export class ListUsersQuery extends QueryBase {
  readonly headers: IncomingHttpHeaders;
  readonly filter: Partial<ListUsersFilter>;

  constructor(props: { headers: IncomingHttpHeaders; filter: Partial<ListUsersFilter> }) {
    super();
    this.headers = props.headers;
    this.filter = props.filter;
  }
}
