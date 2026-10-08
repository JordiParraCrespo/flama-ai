import type { IncomingHttpHeaders } from 'node:http';
import { QueryBase } from '@flama/backend-ddd';

export class ListOrganizationsQuery extends QueryBase {
  readonly headers: IncomingHttpHeaders;

  constructor(props: { headers: IncomingHttpHeaders }) {
    super();
    this.headers = props.headers;
  }
}
